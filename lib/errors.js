var util = require('util');

function ChannelMappingError() {
  this.name = 'ChannelMappingError';
  this.message = 'Invalid channel mapping given';
}
util.inherits(ChannelMappingError, Error);
exports.ChannelMappingError = ChannelMappingError;
