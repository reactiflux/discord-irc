var util = require('util');
var events = require('events');
var sinon = require('sinon');
var ChannelStub = require('./channel-stub');

function SlackStub() {
  this.returnWrongStubInfo = false;
}

util.inherits(SlackStub, events.EventEmitter);

SlackStub.prototype.getChannelStub = function() {
  if (this.returnWrongStubInfo) return;
  return new ChannelStub();
};

SlackStub.prototype.getChannelByID = SlackStub.prototype.getChannelStub;
SlackStub.prototype.getChannelGroupOrDMByName = SlackStub.prototype.getChannelStub;
SlackStub.prototype.getChannelGroupOrDMByID = SlackStub.prototype.getChannelStub;

SlackStub.prototype.getUserByID = function() {
  if (this.returnWrongStubInfo) {
    return {
      name: 'nottheuser'
    };
  }

  return {
    name: 'testuser'
  };
};

SlackStub.prototype.login = sinon.stub();

SlackStub.prototype.resetStub = function() {
  this.returnWrongStubInfo = false;
};

module.exports = SlackStub;
