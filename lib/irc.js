var _ = require('lodash');
var irc = require('irc');
var logger = require('winston');
var path = require('path');
var SlackGateway = require('./slack-gateway');
var errors = require('./errors');
var validateChannelMapping = require('./helpers').validateChannelMapping;

var REQUIRED_FIELDS = ['server', 'nickname', 'channelMapping', 'outgoingToken', 'incomingURL'];

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

  this.server = options.server;
  this.nickname = options.nickname;
  this.outgoingToken = options.outgoingToken;
  this.incomingURL = options.incomingURL;
  this.channelMapping = validateChannelMapping(options.channelMapping);
  this.channels = _.values(this.channelMapping);

  logger.debug('Connecting to IRC');
  this.client = new irc.Client(this.server, this.nickname, {
    userName: this.nickname,
    realName: this.nickname,
    channels: this.channels
  });

  this.slackGateway = new SlackGateway(this.incomingURL, this.channelMapping);
  this.attachListeners();
}

Bot.prototype.attachListeners = function() {
  this.client.addListener('registered', function(message) {
    logger.debug('Registered event: ', message);
  });

  this.client.addListener('message', function(from, to, message) {
    logger.debug('Received a message from Slack', from, to, message);
    this.slackGateway.sendToSlack(from, to, message);
  }.bind(this));

  this.client.addListener('error', function(error) {
    logger.error('Received error event from IRC', error);
  });
};

function ensureHash(channel) {
  if (channel[0] !== '#') channel = '#' + channel;
  return channel;
}

Bot.prototype.sendMessage = function(from, channel, message) {
  var ircChannel = this.channelMapping[ensureHash(channel)];
  if (ircChannel) {
    logger.debug('Sending message to IRC', from, channel, message);
    this.client.say(ircChannel, '<' + from + '> ' + message);
  }
};

/**
 * Reads from the provided config file and returns an array of bots
 * @return {object[]}
 */
function createBots() {
  var configFile = require(path.resolve(process.cwd(), process.env.CONFIG_FILE));
  var bots = [];
  if (Array.isArray(configFile)) {
    configFile.forEach(function(config) {
      var bot = new Bot(config);
      bots.push(bot);
    });
  } else if (_.isObject(configFile)) {
    var bot = new Bot(configFile);
    bots.push(bot);
  } else {
    throw new errors.ConfigurationError();
  }

  return bots;
}

module.exports = createBots;
