import _ from 'lodash';
import irc from 'irc';
import logger from 'winston';
import discord from 'discord.js';
import { ConfigurationError } from './errors';
import { validateChannelMapping } from './validators';

const REQUIRED_FIELDS = ['server', 'nickname', 'channelMapping', 'discordEmail', 'discordPassword'];
const NICK_COLORS = ['light_blue', 'dark_blue', 'light_red', 'dark_red', 'light_green',
  'dark_green', 'magenta', 'light_magenta', 'orange', 'yellow', 'cyan', 'light_cyan'];

/**
 * An IRC bot, works as a middleman for all communication
 * @param {object} options - server, nickname, channelMapping, outgoingToken, incomingURL
 */
class Bot {
  constructor(options) {
    REQUIRED_FIELDS.forEach(field => {
      if (!options[field]) {
        throw new ConfigurationError(`Missing configuration field ${field}`);
      }
    });

    validateChannelMapping(options.channelMapping);

    this.discord = new discord.Client();

    this.server = options.server;
    this.nickname = options.nickname;
    this.ircOptions = options.ircOptions;
    this.discordEmail = options.discordEmail;
    this.discordPassword = options.discordPassword;
    this.commandCharacters = options.commandCharacters || [];
    this.channels = _.values(options.channelMapping);

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
    this.discord.login(this.discordEmail, this.discordPassword);

    const ircOptions = {
      userName: this.nickname,
      realName: this.nickname,
      channels: this.channels,
      floodProtection: true,
      floodProtectionDelay: 500,
      ...this.ircOptions
    };

    this.ircClient = new irc.Client(this.server, this.nickname, ircOptions);
    this.attachListeners();
  }

  attachListeners() {
    this.discord.on('ready', () => {
      logger.debug('Connected to Discord');
    });

    this.ircClient.on('registered', message => {
      logger.debug('Registered event: ', message);
      this.autoSendCommands.forEach(element => {
        this.ircClient.send(...element);
      });
    });

    this.ircClient.on('error', error => {
      logger.error('Received error event from IRC', error);
    });

    this.discord.on('error', error => {
      logger.error('Received error event from Discord', error);
    });

    this.discord.on('message', message => {
      // Ignore bot messages and people leaving/joining
      this.sendToIRC(message);
    });

    this.ircClient.on('message', this.sendToDiscord.bind(this));

    this.ircClient.on('notice', (author, to, text) => {
      this.sendToDiscord(author, to, `*${text}*`);
    });

    /**
     * Notify Discord that an IRC client has joined
     * @param   channel   The channel the user joined
     * @param   user      The nickname of the user who joined
     * @param   text      undefined?
     **/
    this.ircClient.on('join', function (channel, user) {
      this.sendSpecialToDiscord(channel, `*${user}* has joined the channel`);
    });

    /**
     * Notify Discord that an IRC client has parted
     * @param   channel   The channel the user parted
     * @param   user      The nickname of the user who parted
     * @param   text      undefined?
     **/
    this.ircClient.on('part', function (channel, user) {
      this.sendSpecialToDiscord(channel, `*${user}* has left the channel`);
    });

    /**
     * Notify Discord that an IRC client has joined
     * @param   user      The nickname of the user who quit
     * @param   reason    The reason why the user quit
     * @param   channel   The channel(s?) they quit from)
     **/
    this.ircClient.on('quit', function (user, reason, channel) {
      this.sendSpecialToDiscord(String(channel), `*${user}* has quit (${reason})`);
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
  }

  parseText(message) {
    const text = message.mentions.reduce((content, mention) => (
      content.replace(`<@${mention.id}>`, `@${mention.username}`)
    ), message.content);

    return text
      .replace(/\n|\r\n|\r/g, ' ')
      .replace(/<#(\d+)>/g, (match, channelId) => {
        const channel = this.discord.channels.get('id', channelId);
        return `#${channel.name}`;
      });
  }

  isCommandMessage(message) {
    return this.commandCharacters.indexOf(message[0]) !== -1;
  }

  sendToIRC(message) {
    const author = message.author;
    // Ignore messages sent by the bot itself:
    if (author.id === this.discord.user.id) return;

    const channelName = `#${message.channel.name}`;
    const ircChannel = this.channelMapping[channelName];

    logger.debug('Channel Mapping', channelName, this.channelMapping[channelName]);
    if (ircChannel) {
      const username = author.username;
      const colorIndex = (username.charCodeAt(0) + username.length) % NICK_COLORS.length;
      const coloredUsername = irc.colors.wrap(NICK_COLORS[colorIndex], username);
      let text = this.parseText(message);

      if (this.isCommandMessage(text)) {
        const prelude = `Command sent from Discord by ${username}:`;
        this.ircClient.say(ircChannel, prelude);
        this.ircClient.say(ircChannel, text);
      } else if (message.attachments && message.attachments.length) {
        message.attachments.forEach(a => {
          const urlMessage =
            `${coloredUsername} posted an attachment to ${channelName} on Discord: ${a.url}`;
          logger.debug('Sending attachment URL to IRC', ircChannel, urlMessage);
          this.ircClient.say(ircChannel, urlMessage);
        });
      } else {
        text = `<${coloredUsername}> ${text}`;
        logger.debug('Sending message to IRC', ircChannel, text);
        this.ircClient.say(ircChannel, text);
      }
    }
  }

  sendToDiscord(author, channel, text) {
    const discordChannelName = this.invertedMapping[channel.toLowerCase()];
    if (discordChannelName) {
      // #channel -> channel before retrieving:
      const discordChannel = this.discord.channels.get('name', discordChannelName.slice(1));

      if (!discordChannel) {
        logger.info('Tried to send a message to a channel the bot isn\'t in: ',
          discordChannelName);
        return;
      }

      const withMentions = text.replace(/@[^\s]+\b/g, match => {
        const user = this.discord.users.get('username', match.substring(1));
        return user ? user.mention() : match;
      });

      // Add bold formatting:
      const withAuthor = `**<${author}>** ${withMentions}`;
      logger.debug('Sending message to Discord', withAuthor, channel, '->', discordChannelName);
      this.discord.sendMessage(discordChannel, withAuthor);
    }
  }

  /**
   * Sends a message to Discord exactly as it appears
   * @param   channel   The channel to send to
   * @param   text      The text to send to discord
   **/
  sendSpecialToDiscord(channel, text) {
    const discordChannelName = this.invertedMapping[channel.toLowerCase()];
    if (discordChannelName) {
      // #channel -> channel before retrieving:
      const discordChannel = this.discord.channels.get('name', discordChannelName.slice(1));

      if (!discordChannel) {
        logger.info('Tried to send a message to a channel the bot isn\'t in: ',
        discordChannelName);
        return;
      }

      logger.debug('Sending special message to Discord', text, channel, '->', discordChannelName);
      this.discord.sendMessage(discordChannel, text);
    }
  }
}

export default Bot;
