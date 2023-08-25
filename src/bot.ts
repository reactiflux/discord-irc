import lodash from 'lodash';
const irc = require('irc-upd');
import discord, { GatewayIntentBits, GuildMember, GuildChannel } from 'discord.js';
import logger from './logger';
// import { ConfigurationError } from './errors';
import { validateChannelMapping } from './validators';
import { formatFromDiscordToIRC, formatFromIRCToDiscord } from './formatting';

// Usernames need to be between 2 and 32 characters for webhooks:
const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 32;

// const REQUIRED_FIELDS = ['server', 'nickname', 'channelMapping', 'discordToken'];
const DEFAULT_NICK_COLORS = ['light_blue', 'dark_blue', 'light_red', 'dark_red', 'light_green',
  'dark_green', 'magenta', 'light_magenta', 'orange', 'yellow', 'cyan', 'light_cyan'];
const patternMatch = /{\$(.+?)}/g;

function escapeMarkdown(text:string) {
  const unescaped = text.replace(/\\(\*|_|`|~|\\)/g, '$1'); // unescape any "backslashed" character
  const escaped = unescaped.replace(/(\*|_|`|~|\\)/g, '\\$1'); // escape *, _, `, ~, \
  return escaped;
}

type Config = {
  server: string,
  nickname: string,
  channelMapping: lodash.Dictionary<string>,
  outgoingToken: string,
  incomingURL: string,
  ircOptions?: any,
  discordToken: string,
  commandCharacters?: string[],
  ircNickColor?: boolean,
  ircNickColors?: string[],
  parallelPingFix?: boolean,
  ircStatusNotices?: boolean,
  announceSelfJoin?: boolean,
  webhooks?: lodash.Dictionary<string>,
  partialMatch?: boolean,
  ignoreUsers?: any,
  format?: any,
  autoSendCommands?: string[]
}

type Hook = {
  id: string,
  client: discord.WebhookClient
}

/**
 * An IRC bot, works as a middleman for all communication
 * @param {object} options - server, nickname, channelMapping, outgoingToken, incomingURL, partialMatch
 */
export default class Bot {
  discord: discord.Client<boolean>;
  server: string;
  nickname: string;
  ircOptions: any;
  discordToken: string;
  commandCharacters: string[];
  ircNickColor: boolean;
  ircNickColors: string[];
  parallelPingFix: boolean;
  channels: string[];
  ircStatusNotices: boolean;
  announceSelfJoin: boolean;
  webhookOptions: lodash.Dictionary<string>;
  partialMatch: boolean;
  ignoreUsers: any;
  format: any;
  formatIRCText: string;
  formatURLAttachment: string;
  formatCommandPrelude: string;
  formatDiscord: string;
  formatWebhookAvatarURL: string;
  channelUsers: lodash.Dictionary<Set<string>>;
  channelMapping: lodash.Dictionary<string>;
  webhooks: lodash.Dictionary<Hook>;
  invertedMapping: lodash.Dictionary<string>;
  autoSendCommands: string[];
  ircClient: any;
  constructor(options:Config) {
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

    this.server = options.server;
    this.nickname = options.nickname;
    this.ircOptions = options.ircOptions;
    this.discordToken = options.discordToken;
    this.commandCharacters = options.commandCharacters || [];
    this.ircNickColor = options.ircNickColor !== false; // default to true
    this.ircNickColors = options.ircNickColors || DEFAULT_NICK_COLORS;
    this.parallelPingFix = options.parallelPingFix === true; // default: false
    this.channels = lodash.values(options.channelMapping);
    this.ircStatusNotices = options.ircStatusNotices ?? false;
    this.announceSelfJoin = options.announceSelfJoin ?? false;
    this.webhookOptions = options.webhooks ?? {};
    this.partialMatch = false;
    if (options.partialMatch) this.partialMatch = true;

    // Nicks to ignore
    this.ignoreUsers = options.ignoreUsers || {};
    this.ignoreUsers.irc = this.ignoreUsers.irc || [];
    this.ignoreUsers.discord = this.ignoreUsers.discord || [];
    this.ignoreUsers.discordIds = this.ignoreUsers.discordIds || [];

    // "{$keyName}" => "variableValue"
    // author/nickname: nickname of the user who sent the message
    // discordChannel: Discord channel (e.g. #general)
    // ircChannel: IRC channel (e.g. #irc)
    // text: the (appropriately formatted) message content
    this.format = options.format || {};

    // "{$keyName}" => "variableValue"
    // displayUsername: nickname with wrapped colors
    // attachmentURL: the URL of the attachment (only applicable in formatURLAttachment)
    this.formatIRCText = this.format.ircText || '<{$displayUsername}> {$text}';
    this.formatURLAttachment = this.format.urlAttachment || '<{$displayUsername}> {$attachmentURL}';

    // "{$keyName}" => "variableValue"
    // side: "Discord" or "IRC"
    if ('commandPrelude' in this.format) {
      this.formatCommandPrelude = this.format.commandPrelude;
    } else {
      this.formatCommandPrelude = 'Command sent from {$side} by {$nickname}:';
    }

    // "{$keyName}" => "variableValue"
    // withMentions: text with appropriate mentions reformatted
    this.formatDiscord = this.format.discord || '**<{$author}>** {$withMentions}';

    // "{$keyName} => "variableValue"
    // nickname: nickame of IRC message sender
    this.formatWebhookAvatarURL = this.format.webhookAvatarURL;

    // Keep track of { channel => [list, of, usernames] } for ircStatusNotices
    this.channelUsers = {};

    this.channelMapping = {};
    this.webhooks = {};

    // Remove channel passwords from the mapping and lowercase IRC channel names
    lodash.forOwn(options.channelMapping, (ircChan, discordChan) => {
      this.channelMapping[discordChan] = ircChan.split(' ')[0].toLowerCase();
    });

    this.invertedMapping = lodash.invert(this.channelMapping);
    this.autoSendCommands = options.autoSendCommands || [];
  }

  connect() {
    logger.debug('Connecting to IRC and Discord');
    this.discord.login(this.discordToken);

    // Extract id and token from Webhook urls and connect.
    lodash.forOwn(this.webhookOptions, (url, channel) => {
      const [id, token] = url.split('/').slice(-2);
      const client = new discord.WebhookClient({ id, token });
      this.webhooks[channel] = {
        id,
        client
      };
    });

    const ircOptions = {
      userName: this.nickname,
      realName: this.nickname,
      channels: this.channels,
      floodProtection: true,
      floodProtectionDelay: 500,
      retryCount: 10,
      autoRenick: true,
      // options specified in the configuration file override the above defaults
      ...this.ircOptions
    };

    // default encoding to UTF-8 so messages to Discord aren't corrupted
    if (!Object.prototype.hasOwnProperty.call(ircOptions, 'encoding')) {
      /* if (irc.canConvertEncoding()) {
        ircOptions.encoding = 'utf-8';
      } else { */
        logger.warn('Cannot convert message encoding; you may encounter corrupted characters with non-English text.\n' +
          'For information on how to fix this, please see: https://github.com/Throne3d/node-irc#character-set-detection');
      // }
    }

    this.ircClient = new irc.Client(this.server, this.nickname, ircOptions);
    this.attachListeners();
  }

  disconnect() {
    this.ircClient.disconnect();
    this.discord.destroy();
    Object.values(this.webhooks).forEach(x => x.client.destroy());
  }

  attachListeners() {
    this.discord.on('ready', () => {
      logger.info('Connected to Discord');
    });

    this.ircClient.on('registered', (message:any) => {
      logger.info('Connected to IRC');
      logger.debug('Registered event: ', message);
      this.autoSendCommands.forEach((element:any) => {
        this.ircClient.send(...element);
      });
    });

    this.ircClient.on('error', (error:any) => {
      logger.error('Received error event from IRC', error);
    });

    this.discord.on('error', (error:any) => {
      logger.error('Received error event from Discord', error);
    });

    this.discord.on('warn', (warning) => {
      logger.warn('Received warn event from Discord', warning);
    });

    this.discord.on('messageCreate', (message) => {
      // Show the IRC channel's /names list when asked for in Discord
      if (message.content.toLowerCase() === '/names') {
        const channelName = `#${(message.channel as GuildChannel)?.name}`;
        const ircChannel = this.channelMapping[message.channel.id] ||
          this.channelMapping[channelName];
        if (this.channelUsers[ircChannel]) {
          const ircNames = this.channelUsers[ircChannel].values();
          const ircNamesArr = new Array(...ircNames);
          this.sendExactToDiscord(ircChannel, `Users in ${ircChannel}\n> ${ircNamesArr.map(escapeMarkdown).join(', ')}`);
        } else {
          logger.warn(`No channelUsers found for ${ircChannel} when /names requested`);
          // Pass the command through if channelUsers is empty
          this.sendToIRC(message);
        }
      } else {
        // Ignore bot messages and people leaving/joining
        this.sendToIRC(message);
      }
    });

    this.ircClient.on('message',
      this.sendToDiscord.bind(this));

    this.ircClient.on('notice', (author:any, to:any, text:any) => {
      this.sendToDiscord(author, to, `*${text}*`);
    });

    this.ircClient.on('nick', (oldNick:string, newNick:string, channels:string[]) => {
      channels.forEach((channelName) => {
        const channel = channelName.toLowerCase();
        if (this.channelUsers[channel]) {
          if (this.channelUsers[channel].has(oldNick)) {
            this.channelUsers[channel].delete(oldNick);
            this.channelUsers[channel].add(newNick);
            if (!this.ircStatusNotices) return;
            this.sendExactToDiscord(channel, `*${oldNick}* is now known as ${newNick}`);
          }
        } else {
          logger.warn(`No channelUsers found for ${channel} when ${oldNick} changed.`);
        }
      });
    });

    this.ircClient.on('join', (channelName:string, nick:string) => {
      logger.debug('Received join:', channelName, nick);
      if (nick === this.ircClient.nick && !this.announceSelfJoin) return;
      const channel = channelName.toLowerCase();
      // self-join is announced before names (which includes own nick)
      // so don't add nick to channelUsers
      if (nick !== this.ircClient.nick) this.channelUsers[channel].add(nick);
      if (!this.ircStatusNotices) return;
      this.sendExactToDiscord(channel, `*${nick}* has joined the channel`);
    });

    this.ircClient.on('part', (channelName:string, nick:string, reason:string) => {
      logger.debug('Received part:', channelName, nick, reason);
      const channel = channelName.toLowerCase();
      // remove list of users when no longer in channel (as it will become out of date)
      if (nick === this.ircClient.nick) {
        logger.debug('Deleting channelUsers as bot parted:', channel);
        delete this.channelUsers[channel];
        return;
      }
      if (this.channelUsers[channel]) {
        this.channelUsers[channel].delete(nick);
      } else {
        logger.warn(`No channelUsers found for ${channel} when ${nick} parted.`);
      }
      if (!this.ircStatusNotices) return;
      this.sendExactToDiscord(channel, `*${nick}* has left the channel (${reason})`);
    });

    this.ircClient.on('quit', (nick:string, reason:string, channels:string[]) => {
      logger.debug('Received quit:', nick, channels);
      channels.forEach((channelName) => {
        const channel = channelName.toLowerCase();
        if (!this.channelUsers[channel]) {
          logger.warn(`No channelUsers found for ${channel} when ${nick} quit, ignoring.`);
          return;
        }
        if (!this.channelUsers[channel].delete(nick)) return;
        if (!this.ircStatusNotices || nick === this.ircClient.nick) return;
        this.sendExactToDiscord(channel, `*${nick}* has quit (${reason})`);
      });
    });

    this.ircClient.on('names', (channelName:string, nicks:string[]) => {
      logger.debug('Received names:', channelName, nicks);
      const channel = channelName.toLowerCase();
      this.channelUsers[channel] = new Set(Object.keys(nicks));
    });

    this.ircClient.on('action', (author:any, to:any, text:any) => {
      this.sendToDiscord(author, to, `_${text}_`);
    });

    this.ircClient.on('invite', (channel:string, from:string) => {
      logger.debug('Received invite:', channel, from);
      if (!this.invertedMapping[channel]) {
        logger.debug('Channel not found in config, not joining:', channel);
      } else {
        this.ircClient.join(channel);
        logger.debug('Joining channel:', channel);
      }
    });

    if (logger.level === 'debug') {
      this.discord.on('debug', (message) => {
        logger.debug('Received debug event from Discord', message);
      });
    }
  }

  static async getDiscordNicknameOnServer(user:discord.User, guild:discord.Guild) {
    if (guild) {
      const members = await guild.members.fetch();
      const userDetails = members.get(user.id);
      if (userDetails) {
        const value = userDetails.nickname || user.displayName;
        logger.debug(`Got username value: ${value}`)
        return value
      }
    }
    const value = user.username;
    logger.debug(`Got username value: ${value}`)
    return user.username;
  }

  parseText(message:discord.Message<boolean>) {
    const text = message.mentions.users.reduce((content: string, mention) => {
      if (!message.guild) return "";
      const displayName = Bot.getDiscordNicknameOnServer(mention, message.guild);
      const userMentionRegex = RegExp(`<@(&|!)?${mention.id}>`, 'g');
      return content.replace(userMentionRegex, `@${displayName}`);
    }, message.content);

    return text
      .replace(/\n|\r\n|\r/g, ' ')
      .replace(/<#(\d+)>/g, (_: any, channelId: string) => {
        const channel = this.discord.channels.cache.get(channelId);
        if (channel) return `#${(channel as GuildChannel)?.name}`;
        return '#deleted-channel';
      })
      .replace(/<@&(\d+)>/g, (_: any, roleId: any) => {
        const role = message.guild?.roles.cache.get(roleId);
        if (role) return `@${role.name}`;
        return '@deleted-role';
      })
      .replace(/<a?(:\w+:)\d+>/g, (_: any, emoteName: any) => emoteName);
  }

  isCommandMessage(message: string) {
    return this.commandCharacters.some((prefix: any) => message.startsWith(prefix));
  }

  ignoredIrcUser(user: string) {
    return this.ignoreUsers.irc.some((i: string) => i.toLowerCase() === user.toLowerCase());
  }

  ignoredDiscordUser(discordUser: { username: string; id: any; }) {
    const ignoredName = this.ignoreUsers.discord.some(
      (      i: string) => i.toLowerCase() === discordUser.username.toLowerCase()
    );
    const ignoredId = this.ignoreUsers.discordIds.some((i: any) => i === discordUser.id);
    return ignoredName || ignoredId;
  }

  static substitutePattern(message: string, patternMapping: { [x: string]: any; author?: any; nickname?: any; displayUsername?: any; text?: any; discordChannel?: string; ircChannel?: any; }) {
    return message.replace(patternMatch, (match: any, varName: string | number) => patternMapping[varName] || match);
  }

  async sendToIRC(message: discord.Message<boolean>) {
    const { author } = message;
    // Ignore messages sent by the bot itself:
    if (author.id === this.discord.user?.id ||
        lodash.keys(this.webhooks).some((channel, _, __) => this.webhooks[channel].id === author.id)
    ) return;

    // Do not send to IRC if this user is on the ignore list.
    if (this.ignoredDiscordUser(author)) {
      return;
    }

    const channel = message.channel as unknown as discord.GuildChannel;
    const channelName = `#${channel.name}`;
    const ircChannel = this.channelMapping[channel.id] ||
      this.channelMapping[channelName];

    logger.debug('Channel Mapping', channelName, this.channelMapping[channelName]);
    if (ircChannel) {
      const fromGuild = message.guild;
      if (!fromGuild) return;
      const nickname = await Bot.getDiscordNicknameOnServer(author, fromGuild);
      let text = this.parseText(message);
      let displayUsername = nickname;

      if (this.parallelPingFix) {
        // Prevent users of both IRC and Discord from
        // being mentioned in IRC when they talk in Discord.
        displayUsername = `${displayUsername.slice(0, 1)}\u200B${displayUsername.slice(1)}`;
      }

      if (this.ircNickColor) {
        const colorIndex = (nickname.charCodeAt(0) + nickname.length) % this.ircNickColors.length;
        displayUsername = irc.colors.wrap(this.ircNickColors[colorIndex], displayUsername);
      }

      const patternMap = {
        author: nickname,
        nickname,
        displayUsername,
        text,
        discordChannel: channelName,
        ircChannel,
        attachmentURL: ""
      };

      if (this.isCommandMessage(text)) {
        //patternMap.side = 'Discord';
        logger.debug('Sending command message to IRC', ircChannel, text);
        // if (prelude) this.ircClient.say(ircChannel, prelude);
        if (this.formatCommandPrelude) {
          const prelude = Bot.substitutePattern(this.formatCommandPrelude, patternMap);
          this.ircClient.say(ircChannel, prelude);
        }
        this.ircClient.say(ircChannel, text);
      } else {
        if (text !== '') {
          // Convert formatting
          text = formatFromDiscordToIRC(text);
          patternMap.text = text;

          text = Bot.substitutePattern(this.formatIRCText, patternMap);
          logger.debug('Sending message to IRC', ircChannel, text);
          this.ircClient.say(ircChannel, text);
        }

        if (message.attachments && message.attachments.size) {
          message.attachments.forEach((a: { url: any; }) => {
            patternMap.attachmentURL = a.url;
            const urlMessage = Bot.substitutePattern(this.formatURLAttachment, patternMap);

            logger.debug('Sending attachment URL to IRC', ircChannel, urlMessage);
            this.ircClient.say(ircChannel, urlMessage);
          });
        }
      }
    }
  }

  findDiscordChannel(ircChannel: string) {
    const discordChannelName = this.invertedMapping[ircChannel.toLowerCase()];
    if (discordChannelName) {
      // #channel -> channel before retrieving and select only text channels:
      let discordChannel:discord.Channel|undefined = undefined;

      if (this.discord.channels.cache.has(discordChannelName)) {
        discordChannel = this.discord.channels.cache.get(discordChannelName);
      } else if (discordChannelName.startsWith('#')) {
        discordChannel = this.discord.channels.cache
          .find(c => c.type === discord.ChannelType.GuildText && c.name === discordChannelName.slice(1));
      }

      if (!discordChannel) {
        logger.info(
          'Tried to send a message to a channel the bot isn\'t in: ',
          discordChannelName
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
    const guildMembers = await (channelRef as unknown as GuildChannel).guild.members.fetch();
    const findByNicknameOrUsername = (caseSensitive: boolean) =>
      (member: GuildMember) => {
        if (caseSensitive) {
          return member.user.username === nick ||
            member.nickname === nick || member.displayName === nick;
        }
        const nickLowerCase = nick.toLowerCase();
        return member.user.username.toLowerCase() === nickLowerCase
          || (member.nickname && member.nickname.toLowerCase() === nickLowerCase)
          || (member.displayName.toLowerCase() === nickLowerCase);
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
      return Bot.substitutePattern(this.formatWebhookAvatarURL, { nickname: nick });
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
      withMentions: "",
      side: ""
    };

    if (this.isCommandMessage(text)) {
      patternMap.side = 'IRC';
      logger.debug('Sending command message to Discord', `#${channelName}`, text);
      if (this.formatCommandPrelude) {
        const prelude = Bot.substitutePattern(this.formatCommandPrelude, patternMap);
        if(discordChannel.type === discord.ChannelType.GuildText)
          discordChannel.send(prelude);
       }
      if(discordChannel.type === discord.ChannelType.GuildText)
        discordChannel.send(text);
      return;
    }

    let guild:discord.Guild|undefined = undefined;
    if (discordChannel.type === discord.ChannelType.GuildText)
      guild = discordChannel.guild;
    const members = await guild?.members.fetch();
    if (!members) return;
    const withMentions = withFormat.replace(/@([^\s#]+)/g, (match, username) => {
      // @username#1234 => mention
      // skips usernames including spaces for ease (they cannot include hashes)
      // checks case insensitively as Discord does
      const user = members?.find((x) =>
        Bot.caseComp(x.user.username, username) ||
        Bot.caseComp(x.user.displayName, username));
      if (user)
        return user.toString();

      return match;
    }).replace(/^([^@\s:,]+)[:,]|@([^\s]+)/g, (match, startRef, atRef) => {
      const reference = startRef || atRef;

      // this preliminary stuff is ultimately unnecessary
      // but might save time over later more complicated calculations
      // @nickname => mention, case insensitively
      const nickUser = members.find((x) => x.nickname && Bot.caseComp(x.nickname, reference));
      if (nickUser) return nickUser;

      // @username => mention, case insensitively
      const user = members.find((x) => Bot.caseComp(x.user.username, reference) || Bot.caseComp(x.user.displayName, reference));
      if (user) return user;

      // Disable broken partial mentions
      if (!this.partialMatch) return match;

      // @role => mention, case insensitively
      const role = guild?.roles.cache.find((x: { mentionable: any; name: any; }) => x.mentionable && Bot.caseComp(x.name, reference));
      if (role) return role;

      // No match found checking the whole word. Check for partial matches now instead.
      // @nameextra => [mention]extra, case insensitively, as Discord does
      // uses the longest match, and if there are two, whichever is a match by case
      let matchLength = 0;
      let bestMatch:any = null;
      let caseMatched = false;

      // check if a partial match is found in reference and if so update the match values
      const checkMatch = function (matchString: string | string[], matchValue: any) {
        // if the matchString is longer than the current best and is a match
        // or if it's the same length but it matches by case unlike the current match
        // set the best match to this matchString and matchValue
        if ((matchString.length > matchLength && Bot.caseStartsWith(reference, (matchString as string)))
          || (matchString.length === matchLength && !caseMatched
            && reference.startsWith(matchString))) {
          matchLength = matchString.length;
          bestMatch = matchValue;
          caseMatched = reference.startsWith(matchString);
        }
      };

      // check users by username and nickname
      members.forEach((member: { user: { username: any; }; nickname: any; }) => {
        checkMatch(member.user.username, member);
        if (bestMatch === member || !member.nickname) return;
        checkMatch(member.nickname, member);
      });
      // check mentionable roles by visible name
      guild?.roles.cache.forEach((member: { mentionable: any; name: any; }) => {
        if (!member.mentionable) return;
        checkMatch(member.name, member);
      });

      // if a partial match was found, return the match and the unmatched trailing characters
      if (bestMatch) return bestMatch.toString() + reference.substring(matchLength);

      return match;
    }).replace(/:(\w+):/g, (match, ident) => {
      // :emoji: => mention, case sensitively
      const emoji = guild?.emojis.cache.find((x: { name: any; requiresColons: any; }) => x.name === ident && x.requiresColons);
      if (emoji) return emoji.toString();

      return match;
    }).replace(/#([^\s#@'!?,.]+)/g, (match, channelName) => {
      // channel names can't contain spaces, #, @, ', !, ?, , or .
      // (based on brief testing. they also can't contain some other symbols,
      // but these seem likely to be common around channel references)

      // discord matches channel names case insensitively
      const chan = guild?.channels.cache.find((x: { name: any; }) => Bot.caseComp(x.name, channelName));
      return (chan || match).toString();
    });

    // Webhooks first
    const webhook = this.findWebhook(channel);
    if (webhook) {
      if (discordChannel.type === discord.ChannelType.GuildText)
        logger.debug('Sending message to Discord via webhook', withMentions, channel, '->', `#${discordChannel.name}`);
      if (this.discord.user === null) return;
      // const permissions = discordChannel.permissionsFor(this.discord.user);
      const canPingEveryone = false;
      /*
      if (permissions) {
        canPingEveryone = permissions.has(discord.Permissions.FLAGS.MENTION_EVERYONE);
      }
      */
      const avatarURL = await this.getDiscordAvatar(author, channel) ?? undefined;
      const username = lodash.padEnd(author.substring(0, USERNAME_MAX_LENGTH), USERNAME_MIN_LENGTH, '_');
      webhook.client.send({
        username,
        content: withMentions,
        avatarURL,
        allowedMentions: {
          parse:
            canPingEveryone ? ['users', 'roles', 'everyone'] : ['users', 'roles'],
          repliedUser: true
        }
      }).catch(logger.error);
      return;
    }

    patternMap.withMentions = withMentions;

    // Add bold formatting:
    // Use custom formatting from config / default formatting with bold author
    const withAuthor = Bot.substitutePattern(this.formatDiscord, patternMap);
    if (discordChannel.type === discord.ChannelType.GuildText) {
      logger.debug('Sending message to Discord', withAuthor, channel, '->', `#${discordChannel.name}`);
      discordChannel.send(withAuthor);
    }
  }

  /* Sends a message to Discord exactly as it appears */
  sendExactToDiscord(channel: string, text: string) {
    const discordChannel = this.findDiscordChannel(channel);
    if (!discordChannel) return;


    if (discordChannel.type === discord.ChannelType.GuildText) {
      logger.debug('Sending special message to Discord', text, channel, '->', `#${discordChannel.name}`);
      discordChannel.send(text);
    }
  }
}
