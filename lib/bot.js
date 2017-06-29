import _ from 'lodash';
import irc from 'irc';
import logger from 'winston';
import discord from 'discord.js';
import { ConfigurationError } from './errors';
import { validateChannelMapping } from './validators';
import { formatFromDiscordToIRC, formatFromIRCToDiscord } from './formatting';

const REQUIRED_FIELDS = ['server', 'nickname', 'channelMapping', 'discordToken'];
const NICK_COLORS = ['light_blue', 'dark_blue', 'light_red', 'dark_red', 'light_green',
  'dark_green', 'magenta', 'light_magenta', 'orange', 'yellow', 'cyan', 'light_cyan'];
const patternMatch = /{\$(.+?)}/g;

/**
 * An IRC bot, works as a middleman for all communication
 * @param {object} options - server, nickname, channelMapping, outgoingToken, incomingURL
 */
class Bot {
  constructor(options) {
    REQUIRED_FIELDS.forEach((field) => {
      if (!options[field]) {
        throw new ConfigurationError(`Missing configuration field ${field}`);
      }
    });

    validateChannelMapping(options.channelMapping);

    this.discord = new discord.Client({ autoReconnect: true });

    this.server = options.server;
    this.nickname = options.nickname;
    this.ircOptions = options.ircOptions;
    this.discordToken = options.discordToken;
    this.commandCharacters = options.commandCharacters || [];
    this.ircNickColor = options.ircNickColor !== false; // default to true
    this.channels = _.values(options.channelMapping);
    this.ircStatusNotices = options.ircStatusNotices;
    this.announceSelfJoin = options.announceSelfJoin;

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
    this.formatCommandPrelude = this.format.commandPrelude || 'Command sent from {$side} by {$nickname}:';

    // "{$keyName}" => "variableValue"
    // withMentions: text with appropriate mentions reformatted
    this.formatDiscord = this.format.discord || '**<{$author}>** {$withMentions}';

    // Keep track of { channel => [list, of, usernames] } for ircStatusNotices
    this.channelUsers = {};

    this.channelMapping = {};

    // Remove channel passwords from the mapping and lowercase IRC channel names
    _.forOwn(options.channelMapping, (ircChan, discordChan) => {
      this.channelMapping[discordChan] = ircChan.split(' ')[0].toLowerCase();
    });

    this.invertedMapping = _.invert(this.channelMapping);
    this.autoSendCommands = options.autoSendCommands || [];
  }

  connect() {
    logger.debug('Connecting to IRC and Discord');
    this.discord.login(this.discordToken);

    const ircOptions = {
      userName: this.nickname,
      realName: this.nickname,
      channels: this.channels,
      floodProtection: true,
      floodProtectionDelay: 500,
      retryCount: 10,
      ...this.ircOptions
    };

    this.ircClient = new irc.Client(this.server, this.nickname, ircOptions);
    this.attachListeners();
  }

  attachListeners() {
    this.discord.on('ready', () => {
      logger.info('Connected to Discord');
    });

    this.ircClient.on('registered', (message) => {
      logger.info('Connected to IRC');
      logger.debug('Registered event: ', message);
      this.autoSendCommands.forEach((element) => {
        this.ircClient.send(...element);
      });
    });

    this.ircClient.on('error', (error) => {
      logger.error('Received error event from IRC', error);
    });

    this.discord.on('error', (error) => {
      logger.error('Received error event from Discord', error);
    });

    this.discord.on('warn', (warning) => {
      logger.warn('Received warn event from Discord', warning);
    });

    this.discord.on('message', (message) => {
      // Ignore bot messages and people leaving/joining
      this.sendToIRC(message);
    });

    this.ircClient.on('message', this.sendToDiscord.bind(this));

    this.ircClient.on('notice', (author, to, text) => {
      this.sendToDiscord(author, to, `*${text}*`);
    });

    this.ircClient.on('nick', (oldNick, newNick, channels) => {
      if (!this.ircStatusNotices) return;
      channels.forEach((channelName) => {
        const channel = channelName.toLowerCase();
        if (this.channelUsers[channel]) {
          if (this.channelUsers[channel].has(oldNick)) {
            this.channelUsers[channel].delete(oldNick);
            this.channelUsers[channel].add(newNick);
            this.sendExactToDiscord(channel, `*${oldNick}* is now known as ${newNick}`);
          }
        } else {
          logger.warn(`No channelUsers found for ${channel} when ${oldNick} changed.`);
        }
      });
    });

    this.ircClient.on('join', (channelName, nick) => {
      logger.debug('Received join:', channelName, nick);
      if (!this.ircStatusNotices) return;
      if (nick === this.nickname && !this.announceSelfJoin) return;
      const channel = channelName.toLowerCase();
      // self-join is announced before names (which includes own nick)
      // so don't add nick to channelUsers
      if (nick !== this.nickname) this.channelUsers[channel].add(nick);
      this.sendExactToDiscord(channel, `*${nick}* has joined the channel`);
    });

    this.ircClient.on('part', (channelName, nick, reason) => {
      logger.debug('Received part:', channelName, nick, reason);
      if (!this.ircStatusNotices) return;
      const channel = channelName.toLowerCase();
      // remove list of users when no longer in channel (as it will become out of date)
      if (nick === this.nickname) {
        logger.debug('Deleting channelUsers as bot parted:', channel);
        delete this.channelUsers[channel];
        return;
      }
      if (this.channelUsers[channel]) {
        this.channelUsers[channel].delete(nick);
      } else {
        logger.warn(`No channelUsers found for ${channel} when ${nick} parted.`);
      }
      this.sendExactToDiscord(channel, `*${nick}* has left the channel (${reason})`);
    });

    this.ircClient.on('quit', (nick, reason, channels) => {
      logger.debug('Received quit:', nick, channels);
      if (!this.ircStatusNotices || nick === this.nickname) return;
      channels.forEach((channelName) => {
        const channel = channelName.toLowerCase();
        if (!this.channelUsers[channel]) {
          logger.warn(`No channelUsers found for ${channel} when ${nick} quit, ignoring.`);
          return;
        }
        if (!this.channelUsers[channel].delete(nick)) return;
        this.sendExactToDiscord(channel, `*${nick}* has quit (${reason})`);
      });
    });

    this.ircClient.on('names', (channelName, nicks) => {
      logger.debug('Received names:', channelName, nicks);
      if (!this.ircStatusNotices) return;
      const channel = channelName.toLowerCase();
      this.channelUsers[channel] = new Set(Object.keys(nicks));
    });

    this.ircClient.on('action', (author, to, text) => {
      this.sendToDiscord(author, to, `_${text}_`);
    });

    this.ircClient.on('invite', (channel, from) => {
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

  static getDiscordNicknameOnServer(user, guild) {
    const userDetails = guild.members.get(user.id);
    if (userDetails) {
      return userDetails.nickname || user.username;
    }
    return user.username;
  }

  parseText(message) {
    const text = message.mentions.users.reduce((content, mention) => {
      const displayName = Bot.getDiscordNicknameOnServer(mention, message.guild);
      return content.replace(`<@${mention.id}>`, `@${displayName}`)
             .replace(`<@!${mention.id}>`, `@${displayName}`)
             .replace(`<@&${mention.id}>`, `@${displayName}`);
    }, message.content);

    return text
      .replace(/\n|\r\n|\r/g, ' ')
      .replace(/<#(\d+)>/g, (match, channelId) => {
        const channel = this.discord.channels.get(channelId);
        if (channel) return `#${channel.name}`;
        return '#deleted-channel';
      })
      .replace(/<@&(\d+)>/g, (match, roleId) => {
        const role = message.guild.roles.get(roleId);
        if (role) return `@${role.name}`;
        return '@deleted-role';
      })
      .replace(/<(:\w+:)\d+>/g, (match, emoteName) => emoteName);
  }

  isCommandMessage(message) {
    return this.commandCharacters.indexOf(message[0]) !== -1;
  }

  static substitutePattern(message, patternMapping) {
    return message.replace(patternMatch, (match, varName) => patternMapping[varName] || match);
  }

  sendToIRC(message) {
    const author = message.author;
    // Ignore messages sent by the bot itself:
    if (author.id === this.discord.user.id) return;

    const channelName = `#${message.channel.name}`;
    const ircChannel = this.channelMapping[message.channel.id] ||
                                           this.channelMapping[channelName];

    logger.debug('Channel Mapping', channelName, this.channelMapping[channelName]);
    if (ircChannel) {
      const fromGuild = message.guild;
      const nickname = Bot.getDiscordNicknameOnServer(author, fromGuild);
      let text = this.parseText(message);
      let displayUsername = nickname;
      if (this.ircNickColor) {
        const colorIndex = (nickname.charCodeAt(0) + nickname.length) % NICK_COLORS.length;
        displayUsername = irc.colors.wrap(NICK_COLORS[colorIndex], nickname);
      }

      const patternMap = {
        author: nickname,
        nickname,
        displayUsername,
        text,
        discordChannel: channelName,
        ircChannel
      };

      if (this.isCommandMessage(text)) {
        patternMap.side = 'Discord';
        const prelude = Bot.substitutePattern(this.formatCommandPrelude, patternMap);
        logger.debug('Sending command message to IRC', ircChannel, text);
        this.ircClient.say(ircChannel, prelude);
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
          message.attachments.forEach((a) => {
            patternMap.attachmentURL = a.url;
            const urlMessage = Bot.substitutePattern(this.formatURLAttachment, patternMap);

            logger.debug('Sending attachment URL to IRC', ircChannel, urlMessage);
            this.ircClient.say(ircChannel, urlMessage);
          });
        }
      }
    }
  }

  findDiscordChannel(ircChannel) {
    const discordChannelName = this.invertedMapping[ircChannel.toLowerCase()];
    if (discordChannelName) {
      // #channel -> channel before retrieving and select only text channels:
      const discordChannel = discordChannelName.startsWith('#') ? this.discord.channels
        .filter(c => c.type === 'text')
        .find('name', discordChannelName.slice(1)) : this.discord.channels.get(discordChannelName);

      if (!discordChannel) {
        logger.info('Tried to send a message to a channel the bot isn\'t in: ',
          discordChannelName);
        return null;
      }
      return discordChannel;
    }
    return null;
  }

  sendToDiscord(author, channel, text) {
    const discordChannel = this.findDiscordChannel(channel);
    if (!discordChannel) return;

    // Convert text formatting (bold, italics, underscore)
    const withFormat = formatFromIRCToDiscord(text);

    const patternMap = {
      author,
      nickname: author,
      text: withFormat,
      discordChannel: `#${discordChannel.name}`,
      ircChannel: channel
    };

    if (this.isCommandMessage(text)) {
      patternMap.side = 'IRC';
      const prelude = Bot.substitutePattern(this.formatCommandPrelude, patternMap);
      logger.debug('Sending command message to Discord', `#${discordChannel.name}`, text);
      discordChannel.sendMessage(prelude);
      discordChannel.sendMessage(text);
      return;
    }

    const withMentions = withFormat.replace(/@[^\s]+\b/g, (match) => {
      const search = match.substring(1);
      const guild = discordChannel.guild;
      const nickUser = guild.members.find('nickname', search);
      if (nickUser) {
        return nickUser;
      }

      const user = this.discord.users.find('username', search);
      if (user) {
        return user;
      }

      const role = guild.roles.find('name', search);
      if (role && role.mentionable) {
        return role;
      }

      return match;
    }).replace(/:(\w+):/g, (match, ident) => {
      const guild = discordChannel.guild;
      const emoji = guild.emojis.find(x => x.name === ident && x.requiresColons);
      if (emoji) {
        return `<:${emoji.identifier}>`; // identifier = name + ":" + id
      }

      return match;
    });

    patternMap.withMentions = withMentions;

    // Add bold formatting:
    // Use custom formatting from config / default formatting with bold author
    const withAuthor = Bot.substitutePattern(this.formatDiscord, patternMap);
    logger.debug('Sending message to Discord', withAuthor, channel, '->', `#${discordChannel.name}`);
    discordChannel.sendMessage(withAuthor);
  }

  /* Sends a message to Discord exactly as it appears */
  sendExactToDiscord(channel, text) {
    const discordChannel = this.findDiscordChannel(channel);
    if (!discordChannel) return;

    logger.debug('Sending special message to Discord', text, channel, '->', `#${discordChannel.name}`);
    discordChannel.sendMessage(text);
  }
}

export default Bot;
