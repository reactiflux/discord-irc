function ChannelMappingError() {
  this.name = 'ChannelMappingError';
  this.message = 'Invalid channel mapping given';
}
ChannelMappingError.prototype = Object.create(Error.prototype);
ChannelMappingError.prototype.constructor = ChannelMappingError;
exports.ChannelMappingError = ChannelMappingError;
