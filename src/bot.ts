import { Client, ClientOptions } from 'irc';
import discord, {
  GatewayIntentBits,
  GuildChannel,
  GuildMember,
} from 'npm:discord.js';
import Dlog from 'dlog';

// import { ConfigurationError } from './errors';
import { validateChannelMapping } from './validators.ts';
import {
  formatFromDiscordToIRC,
  formatFromIRCToDiscord,
} from './formatting.ts';
import { DEFAULT_NICK_COLORS, wrap } from './colors.ts';
import { Dictionary, escapeMarkdown, forEachAsync, invert } from './helpers.ts';
import { Config } from './config.ts';

// Usernames need to be between 2 and 32 characters for webhooks:
const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 32;

// Configure debug logging with environment
const debug = (Deno.env.get('DEBUG') ?? 'false').toLowerCase() === 'true';

// const REQUIRED_FIELDS = ['server', 'nickname', 'channelMapping', 'discordToken'];
const patternMatch = /{\$(.+?)}/g;

type Hook = {
  id: string;
  client: discord.WebhookClient;
};

/**
 * An IRC bot, works as a middleman for all communication
 * @param {object} options - server, nickname, channelMapping, outgoingToken, incomingURL, partialMatch
 */
export default class Bot {
  discord: discord.Client<boolean>;
  logger: Dlog;
  options: Config;
  channels: string[];
  webhookOptions: Dictionary<string>;
  formatIRCText: string;
  formatURLAttachment: string;
  formatCommandPrelude: string;
  formatDiscord: string;
  formatWebhookAvatarURL: string;
  channelUsers: Dictionary<Array<string>>;
  channelMapping: Dictionary<string>;
  webhooks: Dictionary<Hook>;
  invertedMapping: Dictionary<string>;
  ircClient: Client;
  ircNickColors: string[] = DEFAULT_NICK_COLORS;
  constructor(options: Config) {
    /* REQUIRED_FIELDS.forEach((field) => {
      if (!options[field]) {
        throw new ConfigurationError(`Missing configuration field ${field}`);
      }
    }); */
    validateChannelMapping(options.channelMapping);

    this.discord = new discord.Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
    });

    this.options = options;
    this.logger = new Dlog(options.nickname);
    this.channels = Object.values(options.channelMapping);
    this.webhookOptions = options.webhooks ?? {};
    if (options.allowRolePings === undefined) {
      options.allowRolePings = true;
    }

    // "{$keyName}" => "variableValue"
    // displayUsername: nickname with wrapped colors
    // attachmentURL: the URL of the attachment (only applicable in formatURLAttachment)
    this.formatIRCText = options.format?.ircText ||
      '<{$displayUsername}> {$text}';
    this.formatURLAttachment = options.format?.urlAttachment ||
      '<{$displayUsername}> {$attachmentURL}';

    // "{$keyName}" => "variableValue"
    // side: "Discord" or "IRC"
    if (options.format && options.format.commandPrelude) {
      this.formatCommandPrelude = options.format.commandPrelude;
    } else {
      this.formatCommandPrelude = 'Command sent from {$side} by {$nickname}:';
    }

    // "{$keyName}" => "variableValue"
    // withMentions: text with appropriate mentions reformatted
    this.formatDiscord = options.format?.discord ||
      '**<{$author}>** {$withMentions}';

    // "{$keyName} => "variableValue"
    // nickname: nickame of IRC message sender
    this.formatWebhookAvatarURL = options.format?.webhookAvatarURL ?? '';

    // Keep track of { channel => [list, of, usernames] } for ircStatusNotices
    this.channelUsers = {};

    this.channelMapping = {};
    this.webhooks = {};

    if (options.ircNickColors) {
      this.ircNickColors = options.ircNickColors;
    }

    // Remove channel passwords from the mapping and lowercase IRC channel names
    Object.entries(options.channelMapping).forEach(([discordChan, ircChan]) => {
      this.channelMapping[discordChan] = ircChan.split(' ')[0].toLowerCase();
    });

    this.invertedMapping = invert(this.channelMapping);
    const ircOptions: ClientOptions = {
      nick: options.nickname,
      username: options.nickname,
      realname: options.nickname,
      password: options.ircOptions?.password,
      reconnect: {
        attempts: Number.MAX_SAFE_INTEGER,
        delay: 10,
      },
      ...options.ircOptions,
    };

    this.ircClient = new Client(ircOptions);
  }

  async connect() {
    debug && this.logger.debug('Connecting to IRC and Discord');
    await this.discord.login(this.options.discordToken);

    // Extract id and token from Webhook urls and connect.
    Object.entries(this.webhookOptions).forEach(([channel, url]) => {
      const [id, token] = url.split('/').slice(-2);
      const client = new discord.WebhookClient({ id, token });
      this.webhooks[channel] = {
        id,
        client,
      };
    });

    this.attachListeners();
    await this.ircClient.connect(this.options.server);
    Object.entries(this.invertedMapping).forEach(([ircChannel, _]) => {
      this.logger.info(`Joining channel ${ircChannel}`);
      this.ircClient.join(ircChannel);
    });
  }

  disconnect() {
    this.ircClient.disconnect();
    this.discord.destroy();
    Object.values(this.webhooks).forEach((x) => x.client.destroy());
  }

  attachListeners() {
    this.discord.on('ready', () => {
      this.logger.info('Connected to Discord');
    });

    this.ircClient.on('register', (message) => {
      this.logger.info('Connected to IRC');
      debug && this.logger.debug(
        `Registered event:\n${JSON.stringify(message, null, 2)}`,
      );
      forEachAsync(
        this.options.autoSendCommands ?? [],
        async (element: [any, string]) => {
          await this.ircClient.send(...element);
        },
      );
    });

    this.ircClient.on('error', (error) => {
      this.logger.error(
        `Received error event from IRC\n${JSON.stringify(error, null, 2)}`,
      );
    });

    this.discord.on('error', (error) => {
      this.logger.error(
        `Received error event from Discord\n${JSON.stringify(error, null, 2)}`,
      );
    });

    this.discord.on('warn', (warning) => {
      this.logger.warn(
        `Received warn event from Discord\n${JSON.stringify(warning, null, 2)}`,
      );
    });

    this.discord.on('messageCreate', async (message) => {
      // Show the IRC channel's /names list when asked for in Discord
      if (message.content.toLowerCase() === '/names') {
        const channelName = `#${(message.channel as GuildChannel)
          ?.name}`;
        const ircChannel = this.channelMapping[message.channel.id] ||
          this.channelMapping[channelName];
        if (this.channelUsers[ircChannel]) {
          const ircNames = this.channelUsers[ircChannel].values();
          const ircNamesArr = new Array(...ircNames);
          await this.sendExactToDiscord(
            ircChannel,
            `Users in ${ircChannel}\n> ${
              ircNamesArr
                .map(escapeMarkdown) //TODO: Switch to discord.js escape markdown
                .join(', ')
            }`,
          );
        } else {
          this.logger.warn(
            `No channelUsers found for ${ircChannel} when /names requested`,
          );
          // Pass the command through if channelUsers is empty
          await this.sendToIRC(message);
        }
      } else {
        // Ignore bot messages and people leaving/joining
        await this.sendToIRC(message);
      }
    });

    this.ircClient.on(
      'privmsg:channel',
      async (event) => {
        await this.sendToDiscord(
          event.source?.name ?? '',
          event.params.target,
          event.params.text,
        );
      },
    );

    this.ircClient.on(
      'notice',
      (event) => {
        debug &&
          this.logger.debug(
            `Received notice:\n${JSON.stringify(event.params.text)}`,
          );
      },
    );

    this.ircClient.on(
      'nick',
      (event) => {
        Object.values(this.channelMapping).forEach((channelName) => {
          const channel = channelName.toLowerCase();
          const newNick = event.params.nick;
          const oldNick = event.source?.name ?? '';
          if (this.channelUsers[channelName]) {
            let users = this.channelUsers[channel];
            const index = users.indexOf(oldNick);
            if (index !== -1) {
              users = users.splice(index, 1);
              users.push(newNick);
              if (!this.options.ircStatusNotices) return;
              this.sendExactToDiscord(
                channel,
                `*${oldNick}* is now known as ${newNick}`,
              );
            }
          } else {
            this.logger.warn(
              `No channelUsers found for ${channel} when ${oldNick} changed.`,
            );
          }
        });
      },
    );

    this.ircClient.on('join', async (event) => {
      const channelName = event.params.channel;
      const nick = event.source?.name ?? '';
      debug && this.logger.debug(`Received join: ${channelName} -- ${nick}`);
      if (nick === this.options.nickname && !this.options.announceSelfJoin) {
        return;
      }
      const channel = channelName.toLowerCase();
      // self-join is announced before names (which includes own nick)
      // so don't add nick to channelUsers
      if (nick !== this.options.nickname) {
        this.channelUsers[channel].push(nick);
      }
      if (!this.options.ircStatusNotices) return;
      await this.sendExactToDiscord(
        channel,
        `*${nick}* has joined the channel`,
      );
    });

    this.ircClient.on(
      'part',
      async (event) => {
        const channelName = event.params.channel;
        const nick = event.source?.name ?? '';
        const reason = event.params.comment;
        debug && this.logger.debug(
          `Received part: ${channelName} -- ${nick} -- ${reason}`,
        );
        const channel = channelName.toLowerCase();
        // remove list of users when no longer in channel (as it will become out of date)
        if (nick === this.options.nickname) {
          debug && this.logger.debug(
            `Deleting channelUsers as bot parted: ${channel}`,
          );
          delete this.channelUsers[channel];
          return;
        }
        const users = this.channelUsers[channel];
        if (users) {
          const index = users.indexOf(nick);
          this.channelUsers[channel] = users.splice(index, 1);
        } else {
          this.logger.warn(
            `No channelUsers found for ${channel} when ${nick} parted.`,
          );
        }
        if (!this.options.ircStatusNotices) return;
        await this.sendExactToDiscord(
          channel,
          `*${nick}* has left the channel (${reason})`,
        );
      },
    );

    this.ircClient.on(
      'quit',
      (event) => {
        const nick = event.source?.name ?? '';
        const reason = event.params.comment ?? '';
        debug && this.logger.debug(
          `Received quit: ${nick}`,
        );
        Object.values(this.channelMapping).forEach((channelName) => {
          const channel = channelName.toLowerCase();
          const users = this.channelUsers[channel];
          if (!users) {
            this.logger.warn(
              `No channelUsers found for ${channel} when ${nick} quit, ignoring.`,
            );
            return;
          }
          const index = users.indexOf(nick);
          if (index === -1) return;
          else this.channelUsers[channel] = users.splice(index, 1);
          if (
            !this.options.ircStatusNotices || nick === this.options.nickname
          ) return;
          this.sendExactToDiscord(
            channel,
            `*${nick}* has quit (${reason})`,
          );
        });
        console.log('quit');
        console.log(event);
      },
    );

    this.ircClient.on('nicklist', (event) => {
      const channelName = event.params.channel;
      const nicks = event.params.nicklist;
      debug && this.logger.debug(
        `Received names: ${channelName}\n${JSON.stringify(nicks, null, 2)}`,
      );
      const channel = channelName.toLowerCase();
      this.channelUsers[channel] = nicks.map((n) => n.nick);
    });

    this.ircClient.on('ctcp_action', async (event) => {
      await this.sendToDiscord(
        event.source?.name ?? '',
        event.params.target,
        `_${event.params.text}_`,
      );
    });

    this.ircClient.on('invite', (event) => {
      const channel = event.params.channel;
      const from = event.params.nick;
      debug && this.logger.debug(`Received invite: ${channel} -- ${from}`);
      if (!this.invertedMapping[channel]) {
        debug && this.logger.debug(
          `Channel not found in config, not joining: ${channel}`,
        );
      } else {
        this.ircClient.join(channel);
        debug && this.logger.debug(`Joining channel: ${channel}`);
      }
    });

    if (debug) {
      this.discord.on('debug', (message) => {
        debug && this.logger.debug(
          `Received debug event from Discord: ${
            JSON.stringify(
              message,
              null,
              2,
            )
          }`,
        );
      });
    }
  }

  async getDiscordNicknameOnServer(user: discord.User, guild: discord.Guild) {
    if (guild) {
      const members = await guild.members.fetch();
      const userDetails = members.get(user.id);
      if (userDetails) {
        const value = userDetails.nickname || user.displayName;
        debug && this.logger.debug(`Got username value: ${value}`);
        return value;
      }
    }
    const value = user.username;
    debug && this.logger.debug(`Got username value: ${value}`);
    return user.username;
  }

  async replaceUserMentions(
    content: string,
    mention: discord.User,
    message: discord.Message<boolean>,
  ): Promise<string> {
    if (!message.guild) return '';
    const displayName = await this.getDiscordNicknameOnServer(
      mention,
      message.guild,
    );
    const userMentionRegex = RegExp(`<@(&|!)?${mention.id}>`, 'g');
    return content.replace(userMentionRegex, `@${displayName}`);
  }

  replaceNewlines(text: string): string {
    return text.replace(/\n|\r\n|\r/g, ' ');
  }

  replaceChannelMentions(text: string): string {
    return text.replace(/<#(\d+)>/g, (_, channelId: string) => {
      const channel = this.discord.channels.cache.get(channelId);
      if (channel) return `#${(channel as GuildChannel)?.name}`;
      return '#deleted-channel';
    });
  }

  replaceRoleMentions(
    text: string,
    message: discord.Message<boolean>,
  ): string {
    return text.replace(/<@&(\d+)>/g, (_, roleId) => {
      const role = message.guild?.roles.cache.get(roleId);
      if (role) return `@${role.name}`;
      return '@deleted-role';
    });
  }

  replaceEmotes(text: string): string {
    return text.replace(/<a?(:\w+:)\d+>/g, (_, emoteName) => emoteName);
  }

  async parseText(message: discord.Message<boolean>) {
    let text = message.content;
    for (const mention of message.mentions.users.values()) {
      text = await this.replaceUserMentions(text, mention, message);
    }

    return this.replaceEmotes(
      this.replaceRoleMentions(
        this.replaceChannelMentions(this.replaceNewlines(text)),
        message,
      ),
    );
  }

  isCommandMessage(message: string) {
    return this.options.commandCharacters?.some((prefix: any) =>
      message.startsWith(prefix)
    ) ?? false;
  }

  ignoredIrcUser(user: string) {
    return this.options.ignoreUsers?.irc.some(
      (i: string) => i.toLowerCase() === user.toLowerCase(),
    ) ?? false;
  }

  ignoredDiscordUser(discordUser: { username: string; id: any }) {
    const ignoredName = this.options.ignoreUsers?.discord.some(
      (i: string) => i.toLowerCase() === discordUser.username.toLowerCase(),
    );
    const ignoredId = this.options.ignoreUsers?.discordIds.some(
      (i: any) => i === discordUser.id,
    );
    return ignoredName || ignoredId || false;
  }

  static substitutePattern(
    message: string,
    patternMapping: {
      [x: string]: any;
      author?: any;
      nickname?: any;
      displayUsername?: any;
      text?: any;
      discordChannel?: string;
      ircChannel?: any;
    },
  ) {
    return message.replace(
      patternMatch,
      (match: any, varName: string | number) =>
        patternMapping[varName] || match,
    );
  }

  async sendToIRC(message: discord.Message<boolean>) {
    const { author } = message;
    // Ignore messages sent by the bot itself:
    if (
      author.id === this.discord.user?.id ||
      Object.keys(this.webhooks).some(
        (channel) => this.webhooks[channel].id === author.id,
      )
    ) {
      return;
    }

    // Do not send to IRC if this user is on the ignore list.
    if (this.ignoredDiscordUser(author)) {
      return;
    }

    const channel = message.channel as discord.GuildChannel;
    const channelName = `#${channel.name}`;
    const ircChannel = this.channelMapping[channel.id] ||
      this.channelMapping[channelName];

    if (ircChannel) {
      const fromGuild = message.guild;
      if (!fromGuild) return;
      const nickname = await this.getDiscordNicknameOnServer(
        author,
        fromGuild,
      );
      let text = await this.parseText(message);
      let displayUsername = nickname;

      if (this.options.parallelPingFix) {
        // Prevent users of both IRC and Discord from
        // being mentioned in IRC when they talk in Discord.
        displayUsername = `${
          displayUsername.slice(
            0,
            1,
          )
        }\u200B${displayUsername.slice(1)}`;
      }

      if (this.options.ircNickColor) {
        const colorIndex = (nickname.charCodeAt(0) + nickname.length) %
            this.ircNickColors.length ?? 0;
        displayUsername = wrap(
          this.ircNickColors[colorIndex],
          displayUsername,
        );
      }

      const patternMap = {
        author: nickname,
        nickname,
        displayUsername,
        text,
        discordChannel: channelName,
        ircChannel,
        attachmentURL: '',
      };

      if (this.isCommandMessage(text)) {
        //patternMap.side = 'Discord';
        debug && this.logger.debug(
          `Sending command message to IRC ${ircChannel} -- ${text}`,
        );
        // if (prelude) this.ircClient.say(ircChannel, prelude);
        if (this.formatCommandPrelude) {
          const prelude = Bot.substitutePattern(
            this.formatCommandPrelude,
            patternMap,
          );
          this.ircClient.privmsg(ircChannel, prelude);
        }
        this.ircClient.privmsg(ircChannel, text);
      } else {
        if (text !== '') {
          // Convert formatting
          text = formatFromDiscordToIRC(text);
          patternMap.text = text;

          text = Bot.substitutePattern(this.formatIRCText, patternMap);
          debug && this.logger.debug(
            `Sending message to IRC ${ircChannel} -- ${text}`,
          );
          this.ircClient.privmsg(ircChannel, text);
        }

        if (message.attachments && message.attachments.size) {
          message.attachments.forEach((a: { url: any }) => {
            patternMap.attachmentURL = a.url;
            const urlMessage = Bot.substitutePattern(
              this.formatURLAttachment,
              patternMap,
            );

            debug && this.logger.debug(
              `Sending attachment URL to IRC ${ircChannel} ${urlMessage}`,
            );
            this.ircClient.privmsg(ircChannel, urlMessage);
          });
        }
      }
    }
  }

  findDiscordChannel(ircChannel: string) {
    const discordChannelName = this.invertedMapping[ircChannel.toLowerCase()];
    if (discordChannelName) {
      // #channel -> channel before retrieving and select only text channels:
      let discordChannel: discord.Channel | undefined = undefined;

      if (this.discord.channels.cache.has(discordChannelName)) {
        discordChannel = this.discord.channels.cache.get(
          discordChannelName,
        );
      } else if (discordChannelName.startsWith('#')) {
        discordChannel = this.discord.channels.cache.find(
          (c) =>
            c.type === discord.ChannelType.GuildText &&
            c.name === discordChannelName.slice(1),
        );
      }

      if (!discordChannel) {
        this.logger.info(
          `Tried to send a message to a channel the bot isn't in: ${discordChannelName}`,
        );
        return null;
      }
      return discordChannel;
    }
    return null;
  }

  findWebhook(ircChannel: string) {
    const discordChannelName = this.invertedMapping[ircChannel.toLowerCase()];
    return discordChannelName && this.webhooks[discordChannelName];
  }

  async getDiscordAvatar(nick: string, channel: string) {
    const channelRef = this.findDiscordChannel(channel);
    if (channelRef === null) return null;
    const guildMembers = await (
      channelRef as GuildChannel
    ).guild.members.fetch();
    const findByNicknameOrUsername =
      (caseSensitive: boolean) => (member: GuildMember) => {
        if (caseSensitive) {
          return (
            member.user.username === nick ||
            member.nickname === nick ||
            member.displayName === nick
          );
        }
        const nickLowerCase = nick.toLowerCase();
        return (
          member.user.username.toLowerCase() === nickLowerCase ||
          (member.nickname &&
            member.nickname.toLowerCase() === nickLowerCase) ||
          member.displayName.toLowerCase() === nickLowerCase
        );
      };

    // Try to find exact matching case
    let users = guildMembers.filter(findByNicknameOrUsername(true));

    // Now let's search case insensitive.
    if (users.size === 0) {
      users = guildMembers.filter(findByNicknameOrUsername(false));
    }

    // No matching user or more than one => default avatar
    if (users && users.size === 1) {
      const url = users.first()?.user.displayAvatarURL({ size: 128 });
      if (url) return url;
    }

    // If there isn't a URL format, don't send an avatar at all
    if (this.formatWebhookAvatarURL) {
      return Bot.substitutePattern(this.formatWebhookAvatarURL, {
        nickname: nick,
      });
    }
    return null;
  }

  // compare two strings case-insensitively
  // for discord mention matching
  static caseComp(str1: string, str2: string) {
    return str1.toUpperCase() === str2.toUpperCase();
  }

  // check if the first string starts with the second case-insensitively
  // for discord mention matching
  static caseStartsWith(str1: string, str2: string) {
    return str1.toUpperCase().startsWith(str2.toUpperCase());
  }

  async sendToDiscord(author: string, channel: string, text: string) {
    const discordChannel = this.findDiscordChannel(channel);
    if (!discordChannel) return;
    const channelName = (discordChannel as GuildChannel).name;

    // Do not send to Discord if this user is on the ignore list.
    if (this.ignoredIrcUser(author)) {
      return;
    }

    // Convert text formatting (bold, italics, underscore)
    const withFormat = formatFromIRCToDiscord(text);

    const patternMap = {
      author,
      nickname: author,
      displayUsername: author,
      text: withFormat,
      discordChannel: `#${channelName}`,
      ircChannel: channel,
      withMentions: '',
      side: '',
    };

    if (this.isCommandMessage(text)) {
      patternMap.side = 'IRC';
      debug && this.logger.debug(
        `Sending command message to Discord #${channelName} -- ${text}`,
      );
      if (this.formatCommandPrelude) {
        const prelude = Bot.substitutePattern(
          this.formatCommandPrelude,
          patternMap,
        );
        if (discordChannel.type === discord.ChannelType.GuildText) {
          discordChannel.send(prelude);
        }
      }
      if (discordChannel.type === discord.ChannelType.GuildText) {
        discordChannel.send(text);
      }
      return;
    }

    let guild: discord.Guild | undefined = undefined;
    if (discordChannel.type === discord.ChannelType.GuildText) {
      guild = discordChannel.guild;
    }
    const members = await guild?.members.fetch();
    if (!members) return;
    const roles = await guild?.roles.fetch();
    if (!roles) return;

    const processQuickUsernames = (input: string) => {
      return input.replace(/@([^\s#]+)/g, (match, username) => {
        // @username#1234 => mention
        // skips usernames including spaces for ease (they cannot include hashes)
        // checks case insensitively as Discord does
        const user = members?.find(
          (x) =>
            Bot.caseComp(x.user.username, username) ||
            Bot.caseComp(x.user.displayName, username),
        );
        if (user) return user.toString();

        return match;
      });
    };

    const processMentionables = (input: string) => {
      return input.replace(
        /^([^@\s:,]+)[:,]|@([^\s]+)/g,
        (match, startRef, atRef) => {
          const reference = startRef || atRef;

          // @username => mention, case insensitively
          const user = members.find(
            (x) =>
              Bot.caseComp(x.user.username, reference) ||
              Bot.caseComp(x.user.displayName, reference),
          );
          if (user) return user;

          if (!this.options.allowRolePings) return;
          // @role => mention, case insensitively
          const role = roles.find(
            (x) => x.mentionable && Bot.caseComp(x.name, reference),
          );
          if (role) return role;

          // Disable broken partial mentions
          if (!this.options.partialMatch) return match;

          // No match found checking the whole word. Check for partial matches now instead.
          // @nameextra => [mention]extra, case insensitively, as Discord does
          // uses the longest match, and if there are two, whichever is a match by case
          let matchLength = 0;
          let bestMatch: any = null;
          let caseMatched = false;

          // check if a partial match is found in reference and if so update the match values
          const checkMatch = function (
            matchString: string | string[],
            matchValue: any,
          ) {
            // if the matchString is longer than the current best and is a match
            // or if it's the same length but it matches by case unlike the current match
            // set the best match to this matchString and matchValue
            if (
              (matchString.length > matchLength &&
                Bot.caseStartsWith(
                  reference,
                  matchString as string,
                )) ||
              (matchString.length === matchLength &&
                !caseMatched &&
                reference.startsWith(matchString))
            ) {
              matchLength = matchString.length;
              bestMatch = matchValue;
              caseMatched = reference.startsWith(matchString);
            }
          };

          // check users by username and nickname
          members.forEach(
            (
              member: { user: { username: any }; nickname: any },
            ) => {
              checkMatch(member.user.username, member);
              if (bestMatch === member || !member.nickname) return;
              checkMatch(member.nickname, member);
            },
          );
          // check mentionable roles by visible name
          roles.forEach((member: { mentionable: any; name: any }) => {
            if (!member.mentionable) return;
            checkMatch(member.name, member);
          });

          // if a partial match was found, return the match and the unmatched trailing characters
          if (bestMatch) {
            return bestMatch.toString() +
              reference.substring(matchLength);
          }

          return match;
        },
      );
    };

    const processEmoji = (input: string) => {
      return input.replace(/:(\w+):/g, (match, ident) => {
        // :emoji: => mention, case sensitively
        const emoji = guild?.emojis.cache.find(
          (x: { name: any; requiresColons: any }) =>
            x.name === ident && x.requiresColons,
        );
        if (emoji) return emoji.toString();

        return match;
      });
    };

    const processChannels = (input: string) => {
      return input.replace(/#([^\s#@'!?,.]+)/g, (match, channelName) => {
        // channel names can't contain spaces, #, @, ', !, ?, , or .
        // (based on brief testing. they also can't contain some other symbols,
        // but these seem likely to be common around channel references)

        // discord matches channel names case insensitively
        const chan = guild?.channels.cache.find((x: { name: any }) =>
          Bot.caseComp(x.name, channelName)
        );
        return (chan || match).toString();
      });
    };

    const withMentions = processChannels(
      processEmoji(
        processMentionables(processQuickUsernames(withFormat)),
      ),
    );

    // Webhooks first
    const webhook = this.findWebhook(channel);
    if (webhook) {
      if (discordChannel.type === discord.ChannelType.GuildText) {
        debug && this.logger.debug(
          `Sending message to Discord via webhook ${withMentions} ${channel} -> #${discordChannel.name}`,
        );
      }
      if (this.discord.user === null) return;
      // const permissions = discordChannel.permissionsFor(this.discord.user);
      const canPingEveryone = false;
      /*
      if (permissions) {
        canPingEveryone = permissions.has(discord.Permissions.FLAGS.MENTION_EVERYONE);
      }
      */
      const avatarURL = (await this.getDiscordAvatar(author, channel)) ??
        undefined;
      const username = author.substring(0, USERNAME_MAX_LENGTH).padEnd(
        USERNAME_MIN_LENGTH,
        '_',
      );
      webhook.client
        .send({
          username,
          content: withMentions,
          avatarURL,
          allowedMentions: {
            parse: canPingEveryone
              ? ['users', 'roles', 'everyone']
              : ['users', 'roles'],
            repliedUser: true,
          },
        })
        .catch(this.logger.error);
      return;
    }

    patternMap.withMentions = withMentions;

    // Add bold formatting:
    // Use custom formatting from config / default formatting with bold author
    const withAuthor = Bot.substitutePattern(this.formatDiscord, patternMap);
    if (discordChannel.type === discord.ChannelType.GuildText) {
      debug && this.logger.debug(
        `Sending message to Discord ${withAuthor} ${channel} -> #${discordChannel.name}`,
      );
      discordChannel.send(withAuthor);
    }
  }

  /* Sends a message to Discord exactly as it appears */
  async sendExactToDiscord(channel: string, text: string) {
    const discordChannel = this.findDiscordChannel(channel);
    if (!discordChannel) return;

    if (discordChannel.type === discord.ChannelType.GuildText) {
      debug && this.logger.debug(
        `Sending special message to Discord ${text} ${channel} -> #${discordChannel.name}`,
      );
      await discordChannel.send(text);
    }
  }
}
