var util = require('util');
var events = require('events');
var sinon = require('sinon');

function ClientStub() {}
util.inherits(ClientStub, events.EventEmitter);

ClientStub.prototype.say = sinon.stub();

module.exports = ClientStub;
