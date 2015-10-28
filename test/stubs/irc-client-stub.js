var util = require('util');
var events = require('events');

function ClientStub() {}
util.inherits(ClientStub, events.EventEmitter);

module.exports = ClientStub;
