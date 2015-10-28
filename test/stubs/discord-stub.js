var util = require('util');
var events = require('events');
var sinon = require('sinon');

function DiscordStub() {
  this.user = {
    id: 'testid'
  };
}
util.inherits(DiscordStub, events.EventEmitter);

DiscordStub.prototype.getChannel = function(key, value) {
  if (key === 'name' && value !== 'discord') return null;
  return {
    name: 'discord',
    id: 1234
  };
};

DiscordStub.prototype.login = sinon.stub();

module.exports = DiscordStub;
