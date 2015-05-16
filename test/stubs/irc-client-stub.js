var util = require('util');
var events = require('events');
var sinon = require('sinon');

function ClientStub() {}

util.inherits(ClientStub, events.EventEmitter);

ClientStub.prototype.say = sinon.stub();

ClientStub.prototype.send = sinon.stub();

ClientStub.prototype.join = sinon.stub();

module.exports = ClientStub;
