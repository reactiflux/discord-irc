var _ = require('lodash');
var irc = require('irc');
var logger = require('winston');
var discord = require('discord.js');
var errors = require('./errors');
var validateChannelMapping = require('./validators').validateChannelMapping;

var REQUIRED_FIELDS = ['server', 'nickname', 'channelMapping', 'discordEmail', 'discordPassword'];

/**
 * An IRC bot, works as a middleman for all communication
 * @param {object} options - server, nickname, channelMapping, outgoingToken, incomingURL
 */
function Bot(options) {
  REQUIRED_FIELDS.forEach(function(field) {
    if (!options[field]) {
      throw new errors.ConfigurationError('Missing configuration field ' + field);
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
  _.forOwn(options.channelMapping, function(ircChan, discordChan) {
    this.channelMapping[discordChan] = ircChan.split(' ')[0].toLowerCase();
  }, this);

  this.invertedMapping = _.invert(this.channelMapping);

  this.autoSendCommands = options.autoSendCommands || [];
}

Bot.prototype.connect = function() {
  logger.debug('Connecting to IRC and Discord');
  this.discord.login(this.discordEmail, this.discordPassword);

  var ircOptions = _.assign({
    userName: this.nickname,
    realName: this.nickname,
    channels: this.channels,
    floodProtection: true,
    floodProtectionDelay: 500
  }, this.ircOptions);

  this.ircClient = new irc.Client(this.server, this.nickname, ircOptions);
  this.attachListeners();
};

Bot.prototype.attachListeners = function() {
  this.discord.on('ready', function() {
    logger.debug('Connected to Discord');
  });

  this.ircClient.on('registered', function(message) {
    logger.debug('Registered event: ', message);
    this.autoSendCommands.forEach(function(element) {
      this.ircClient.send.apply(this.ircClient, element);
    }, this);
  }.bind(this));

  this.ircClient.on('error', function(error) {
    logger.error('Received error event from IRC', error);
  });

  this.discord.on('error', function(error) {
    logger.error('Received error event from Discord', error);
  });

  this.discord.on('message', function(message) {
    // Ignore bot messages and people leaving/joining
    this.sendToIRC(message);
  }.bind(this));

  this.ircClient.on('message', this.sendToDiscord.bind(this));

  this.ircClient.on('notice', function(author, to, text) {
    var formattedText = '*' + text + '*';
    this.sendToDiscord(author, to, formattedText);
  }.bind(this));

  this.ircClient.on('action', function(author, to, text) {
    var formattedText = '_' + text + '_';
    this.sendToDiscord(author, to, formattedText);
  }.bind(this));

  this.ircClient.on('invite', function(channel, from) {
    logger.debug('Received invite:', channel, from);
    if (!this.invertedMapping[channel]) {
      logger.debug('Channel not found in config, not joining:', channel);
    } else {
      this.ircClient.join(channel);
      logger.debug('Joining channel:', channel);
    }
  }.bind(this));
};

Bot.prototype.parseText = function(message) {
  var text = message.mentions.reduce(function(content, mention) {
    return content.replace('<@' + mention.id + '>', '@' + mention.username);
  }, message.content);

  return text
    .replace(/\n|\r\n|\r/g, ' ')
    .replace(/<#(\d+)>/g, function(match, channelId) {
      var channel = this.discord.getChannel('id', channelId);
      return '#' + channel.name;
    }.bind(this));
};

Bot.prototype.isCommandMessage = function(message) {
  return this.commandCharacters.indexOf(message[0]) !== -1;
};

Bot.prototype.sendToIRC = function(message) {
  var author = message.author;
  // Ignore messages sent by the bot itself:
  if (author.id === this.discord.user.id) return;

  var channelName = '#' + message.channel.name;
  var ircChannel = this.channelMapping[channelName];

  logger.debug('Channel Mapping', channelName, this.channelMapping[channelName]);
  if (ircChannel) {
    var username = author.username;
    var text = this.parseText(message);

    if (this.isCommandMessage(text)) {
      var prelude = 'Command sent from Discord by ' + username + ':';
      this.ircClient.say(ircChannel, prelude);
      this.ircClient.say(ircChannel, text);
    } else {
      text = '<' + username + '> ' + text;
      logger.debug('Sending message to IRC', ircChannel, text);
      this.ircClient.say(ircChannel, text);
    }
  }
};

Bot.prototype.sendToDiscord = function(author, channel, text) {
  var discordChannelName = this.invertedMapping[channel.toLowerCase()];
  if (discordChannelName) {
    // #channel -> channel before retrieving:
    var discordChannel = this.discord.getChannel('name', discordChannelName.slice(1));

    if (!discordChannel) {
      logger.info('Tried to send a message to a channel the bot isn\'t in: ',
        discordChannelName);
      return;
    }

    // Add bold formatting:
    var withAuthor = '**<' + author + '>** ' + text;
    logger.debug('Sending message to Discord', withAuthor, channel, '->', discordChannelName);
    this.discord.sendMessage(discordChannel, withAuthor);
  }
};

module.exports = Bot;
