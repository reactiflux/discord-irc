import { Client as IrcClient, ClientOptions } from 'irc';
import Dlog from 'dlog';
import {
  AllowedMentionType,
  Client,
  GatewayIntents,
  Guild,
  Member,
  Message,
  User,
  Webhook,
} from 'harmony';
import { validateChannelMapping } from './validators.ts';
import {
  formatFromDiscordToIRC,
  formatFromIRCToDiscord,
} from './formatting.ts';
import { DEFAULT_NICK_COLORS, wrap } from './colors.ts';
import { Dictionary, forEachAsync, invert, replaceAsync } from './helpers.ts';
import { Config } from './config.ts';
import {
  createIrcActionListener,
  createIrcErrorListener,
  createIrcInviteListener,
  createIrcJoinListener,
  createIrcNickListener,
  createIrcNicklistListener,
  createIrcNoticeListener,
  createIrcPartListener,
  createIrcPrivMessageListener,
  createIrcQuitListener,
  createIrcRegisterListener,
} from './ircListeners.ts';
import {
  createDiscordDebugListener,
  createDiscordErrorListener,
  createDiscordMessageListener,
  createDiscordReadyListener,
} from './discordListeners.ts';
import { AllWebhookMessageOptions } from 'https://raw.githubusercontent.com/harmonyland/harmony/main/src/structures/webhook.ts';

// Usernames need to be between 2 and 32 characters for webhooks:
const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 32;

// const REQUIRED_FIELDS = ['server', 'nickname', 'channelMapping', 'discordToken'];
const patternMatch = /{\$(.+?)}/g;

type Hook = {
  id: string;
  client: Webhook;
};

/**
 * An IRC bot, works as a middleman for all communication
 * @param {object} options - server, nickname, channelMapping, outgoingToken, incomingURL, partialMatch
 */
export default class Bot {
  discord: Client;
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
  ircClient: IrcClient;
  ircNickColors: string[] = DEFAULT_NICK_COLORS;
  debug: boolean = (Deno.env.get('DEBUG') ?? Deno.env.get('VERBOSE') ?? 'false')
    .toLowerCase() === 'true';
  verbose: boolean =
    (Deno.env.get('VERBOSE') ?? 'false').toLowerCase() === 'true';
  constructor(options: Config) {
    /* REQUIRED_FIELDS.forEach((field) => {
      if (!options[field]) {
        throw new ConfigurationError(`Missing configuration field ${field}`);
      }
    }); */
    validateChannelMapping(options.channelMapping);

    this.discord = new Client({
      intents: [
        GatewayIntents.GUILDS,
        GatewayIntents.GUILD_MEMBERS,
        GatewayIntents.GUILD_MESSAGES,
        GatewayIntents.MESSAGE_CONTENT,
      ],
      token: options.discordToken,
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
        delay: 3,
      },
      ...options.ircOptions,
    };

    this.ircClient = new IrcClient(ircOptions);
  }

  async connect() {
    this.debug && this.logger.debug('Connecting to IRC and Discord');
    this.discord.connect();

    // Extract id and token from Webhook urls and connect.
    await forEachAsync(
      Object.entries(this.webhookOptions),
      async ([channel, url]) => {
        const [id, _] = url.split('/').slice(-2);
        const client = await Webhook.fromURL(url, this.discord);
        this.webhooks[channel] = {
          id,
          client,
        };
      },
    );

    this.attachDiscordListeners();
    this.attachIrcListeners();
    await this.ircClient.connect(this.options.server);
    Object.entries(this.invertedMapping).forEach(([ircChannel, _]) => {
      this.logger.info(`Joining channel ${ircChannel}`);
      this.ircClient.join(ircChannel);
    });
  }

  disconnect() {
    this.ircClient.disconnect();
    this.discord.destroy();
  }

  private attachDiscordListeners() {
    this.discord.on('ready', createDiscordReadyListener(this));
    this.discord.on('error', createDiscordErrorListener(this));
    this.discord.on('messageCreate', createDiscordMessageListener(this));
    if (this.debug) {
      this.discord.on('debug', createDiscordDebugListener(this));
    }
  }

  private attachIrcListeners() {
    this.ircClient.on('register', createIrcRegisterListener(this));
    this.ircClient.on('error', createIrcErrorListener(this));
    this.ircClient.on('privmsg:channel', createIrcPrivMessageListener(this));
    this.ircClient.on('notice', createIrcNoticeListener(this));
    this.ircClient.on('nick', createIrcNickListener(this));
    this.ircClient.on('join', createIrcJoinListener(this));
    this.ircClient.on('part', createIrcPartListener(this));
    this.ircClient.on('quit', createIrcQuitListener(this));
    this.ircClient.on('nicklist', createIrcNicklistListener(this));
    this.ircClient.on('ctcp_action', createIrcActionListener(this));
    this.ircClient.on('invite', createIrcInviteListener(this));
  }

  async getDiscordNicknameOnServer(user: User, guild: Guild) {
    if (guild) {
      const member = await guild.members.fetch(user.id);
      const value = member.nick || user.displayName || user.username;
      return value;
    }
    return user.username;
  }

  async replaceUserMentions(
    content: string,
    mention: User,
    message: Message,
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

  async replaceChannelMentions(text: string): Promise<string> {
    return await replaceAsync(
      text,
      /<#(\d+)>/g,
      async (_, channelId: string) => {
        const channel = await this.discord.channels.fetch(channelId);
        if (channel) return `#${channel?.toString()}`;
        return '#deleted-channel';
      },
    );
  }

  async replaceRoleMentions(
    text: string,
    message: Message,
  ): Promise<string> {
    return await replaceAsync(text, /<@&(\d+)>/g, async (_, roleId) => {
      const role = await message.guild?.roles.fetch(roleId);
      if (role) return `@${role.name}`;
      return '@deleted-role';
    });
  }

  replaceEmotes(text: string): string {
    return text.replace(/<a?(:\w+:)\d+>/g, (_, emoteName) => emoteName);
  }

  async parseText(message: Message) {
    let text = message.content;
    for (const mention of message.mentions.users.values()) {
      text = await this.replaceUserMentions(text, mention, message);
    }

    return this.replaceEmotes(
      await this.replaceRoleMentions(
        await this.replaceChannelMentions(this.replaceNewlines(text)),
        message,
      ),
    );
  }

  isCommandMessage(message: string) {
    return this.options.commandCharacters?.some((prefix: string) =>
      message.startsWith(prefix)
    ) ?? false;
  }

  ignoredIrcUser(user: string) {
    return this.options.ignoreUsers?.irc.some(
      (i: string) => i.toLowerCase() === user.toLowerCase(),
    ) ?? false;
  }

  ignoredDiscordUser(discordUser: { username: string; id: string }) {
    const ignoredName = this.options.ignoreUsers?.discord.some(
      (i) => i.toLowerCase() === discordUser.username.toLowerCase(),
    );
    const ignoredId = this.options.ignoreUsers?.discordIds.some(
      (i) => i === discordUser.id,
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

  async sendToIRC(message: Message) {
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

    const channel = message.channel;
    if (!channel.isGuildText()) return;
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
        this.debug && this.logger.debug(
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
          this.debug && this.logger.debug(
            `Sending message to IRC ${ircChannel} -- ${text}`,
          );
          this.ircClient.privmsg(ircChannel, text);
        }

        if (message.attachments && message.attachments.length) {
          message.attachments.forEach((a) => {
            patternMap.attachmentURL = a.url;
            const urlMessage = Bot.substitutePattern(
              this.formatURLAttachment,
              patternMap,
            );

            this.debug && this.logger.debug(
              `Sending attachment URL to IRC ${ircChannel} ${urlMessage}`,
            );
            this.ircClient.privmsg(ircChannel, urlMessage);
          });
        }
      }
    }
  }

  async findDiscordChannel(ircChannel: string) {
    const discordChannelName = this.invertedMapping[ircChannel.toLowerCase()];
    if (discordChannelName) {
      // #channel -> channel before retrieving and select only text channels:
      let discordChannel = await this.discord.channels.get(discordChannelName);

      if (!discordChannel && discordChannelName.startsWith('#')) {
        const channels = await this.discord.channels.array();
        discordChannel = channels.find(
          (c) =>
            c.isGuildText() &&
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
    const channelRef = await this.findDiscordChannel(channel);
    if (channelRef === null) return null;
    if (!channelRef.isGuildText()) return null;
    const guildMembers = await channelRef.guild.members.array();
    const findByNicknameOrUsername =
      (caseSensitive: boolean) => (member: Member) => {
        if (caseSensitive) {
          return (
            member.user.username === nick ||
            member.nick === nick ||
            member.displayName === nick
          );
        }
        const nickLowerCase = nick.toLowerCase();
        return (
          member.user.username.toLowerCase() === nickLowerCase ||
          (member.nick &&
            member.nick.toLowerCase() === nickLowerCase) ||
          member.displayName?.toLowerCase() === nickLowerCase
        );
      };

    // Try to find exact matching case
    let users = guildMembers.filter(findByNicknameOrUsername(true));

    // Now let's search case insensitive.
    if (users.length === 0) {
      users = guildMembers.filter(findByNicknameOrUsername(false));
    }

    // No matching user or more than one => default avatar
    if (users && users.length === 1) {
      const url = users[0]?.user.avatarURL();
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
    const discordChannel = await this.findDiscordChannel(channel);
    if (!discordChannel) return;
    const channelName = discordChannel.mention;

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
      this.debug && this.logger.debug(
        `Sending command message to Discord #${channelName} -- ${text}`,
      );
      if (this.formatCommandPrelude) {
        const prelude = Bot.substitutePattern(
          this.formatCommandPrelude,
          patternMap,
        );
        if (discordChannel.isGuildText()) {
          discordChannel.send(prelude);
        }
      }
      if (discordChannel.isGuildText()) {
        discordChannel.send(text);
      }
      return;
    }

    let guild: Guild | undefined = undefined;
    if (discordChannel.isGuildText()) {
      guild = discordChannel.guild;
    }
    const members = await guild?.members.fetchList();
    if (!members) return;
    console.log(members);
    const roles = await guild?.roles.fetchAll();
    if (!roles) return;
    const channels = await guild?.channels.array();
    if (!channels) return;

    const processQuickUsernames = (input: string) => {
      return input.replace(/@([^\s#]+)/g, (match, username) => {
        // @username#1234 => mention
        // skips usernames including spaces for ease (they cannot include hashes)
        // checks case insensitively as Discord does
        const user = members?.find(
          (x) =>
            Bot.caseComp(x.user.username, username) ||
            Bot.caseComp(x.nick ?? '', username) ||
            Bot.caseComp(x.user.displayName, username),
        );
        if (user) return `<@${user.id}>`;

        return match;
      });
    };

    const processMentionables = (input: string) => {
      return input.replace(
        /^([^@\s:,]+)[:,]|@([^\s]+)/g,
        (match, startRef, atRef) => {
          const reference = startRef || atRef;

          // @username => mention, case insensitively
          const user = members?.find(
            (x) =>
              Bot.caseComp(x.user.username, reference) ||
              Bot.caseComp(x.nick ?? '', reference) ||
              Bot.caseComp(x.user.displayName, reference),
          );
          if (user) return `<@${user.id}>`;

          if (!this.options.allowRolePings) return match;
          // @role => mention, case insensitively
          const role = roles.find(
            (x) => x.mentionable && Bot.caseComp(x.name, reference),
          );
          if (role) return `<@&${role.id}>`;
          return match;
        },
      );
    };

    const processEmoji = async (input: string) => {
      return await replaceAsync(input, /:(\w+):/g, async (match, ident) => {
        // :emoji: => mention, case sensitively
        const emoji = (await guild?.emojis.array())?.find((x) =>
          x.name === ident && x.requireColons
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
        const chan = channels.find((x) => Bot.caseComp(x.name, channelName));
        return (chan || match).toString();
      });
    };

    const withMentions = processChannels(
      await processEmoji(
        processMentionables(processQuickUsernames(withFormat)),
      ),
    );

    // Webhooks first
    const webhook = this.findWebhook(channel);
    if (webhook) {
      if (discordChannel.isGuildText()) {
        this.debug && this.logger.debug(
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
      const payload: AllWebhookMessageOptions = {
        name: username,
        avatar: avatarURL,
        allowedMentions: {
          parse: canPingEveryone
            ? [
              AllowedMentionType.Roles,
              AllowedMentionType.Users,
              AllowedMentionType.Everyone,
            ]
            : [AllowedMentionType.Roles, AllowedMentionType.Users],
          replied_user: true,
        },
      };
      webhook.client.send(withMentions, payload);
      return;
    }

    patternMap.withMentions = withMentions;

    // Add bold formatting:
    // Use custom formatting from config / default formatting with bold author
    const withAuthor = Bot.substitutePattern(this.formatDiscord, patternMap);
    if (discordChannel.isGuildText()) {
      this.debug && this.logger.debug(
        `Sending message to Discord ${withAuthor} ${channel} -> #${discordChannel.name}`,
      );
      discordChannel.send(withAuthor);
    }
  }

  /* Sends a message to Discord exactly as it appears */
  async sendExactToDiscord(channel: string, text: string) {
    const discordChannel = await this.findDiscordChannel(channel);
    if (!discordChannel) return;

    if (discordChannel.isGuildText()) {
      this.debug && this.logger.debug(
        `Sending special message to Discord ${text} ${channel} -> #${discordChannel.name}`,
      );
      await discordChannel.send(text);
    }
  }
}
