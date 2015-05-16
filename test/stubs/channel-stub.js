var util = require('util');
var events = require('events');
var sinon = require('sinon');

function ChannelStub() {
  this.name = 'slack';
  this.is_channel = true;
}

util.inherits(ChannelStub, events.EventEmitter);

ChannelStub.prototype.postMessage = sinon.stub();

module.exports = ChannelStub;
