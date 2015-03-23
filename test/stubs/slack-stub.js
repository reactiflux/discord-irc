var util = require('util');
var events = require('events');
var sinon = require('sinon');
var ChannelStub = require('./channel-stub');

function SlackStub() {}
util.inherits(SlackStub, events.EventEmitter);

SlackStub.prototype.getChannelGroupOrDMByName = function() {
  return new ChannelStub();
};

SlackStub.prototype.getChannelGroupOrDMByID = function() {
  return new ChannelStub();
};

SlackStub.prototype.getUserByID = function() {
  return {
    name: 'testuser'
  };
};

SlackStub.prototype.login = sinon.stub();

module.exports = SlackStub;
