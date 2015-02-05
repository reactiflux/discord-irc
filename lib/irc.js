var _ = require('lodash');
var irc = require('irc');
var channelMapping = require('./channel-mapping');
var SlackGateway = require('./slack-gateway');

function Bot() {
  this.server = process.env.IRC_SERVER;
  this.nickname = process.env.BOT_NICK;
  this.channels = _.values(channelMapping);

  console.log('Connecting to IRC');
  this.client = new irc.Client(this.server, this.nickname, {
    channels: this.channels
  });

  this.slackGateway = new SlackGateway();
  this.attachListeners();
}

Bot.prototype.attachListeners = function() {
  this.client.addListener('registered', function(message) {
    console.log('registered event', message);
  });

  this.client.addListener('message', function(from, to, message) {
    console.log('got a message', from, to, message);
    this.slackGateway.sendToSlack(from, to, message);
  }.bind(this));

  this.client.addListener('error', function(error) {
    console.log('Something went wrong', error);
  });
};

function ensureHash(channel) {
  if (channel[0] !== '#') channel = '#' + channel;
  return channel;
}

Bot.prototype.sendMessage = function(from, channel, message) {
  var ircChannel = channelMapping[ensureHash(channel)];
  if (ircChannel) {
    this.client.say(ircChannel, from + ': ' + message);
  }
};

module.exports = Bot;
