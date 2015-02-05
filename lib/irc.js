var irc = require('irc');
var sendToSlack = require('./slack-gateway');

function Bot() {
  this.server = process.env.IRC_SERVER || 'irc.freenode.net';
  this.nickname = process.env.BOT_NICK;
  this.channels = process.env.CHANNELS.split(',');

  console.log('Connecting to IRC');
  this.client = new irc.Client(this.server, this.nickname, {
    channels: this.channels
  });

  this.attachListeners();
}

Bot.prototype.attachListeners = function() {
  this.client.addListener('registered', function(message) {
    console.log('registered event', message);
  });

  this.client.addListener('message', function(from, to, message) {
    console.log('got a message', from, to, message);
    sendToSlack(from, to, message);
  });

  this.client.addListener('error', function(error) {
    console.log('Something went wrong', error);
  });
};

Bot.prototype.sendMessage = function(from, channel, message) {
  if (this.channels.indexOf(channel) !== -1) {
    this.client.say(channel, from + ': ' + message);
  }
};

module.exports = Bot;
