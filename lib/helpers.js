var errors = require('./errors');

exports.validateChannelMapping = function() {
  var mapping = process.env.CHANNEL_MAPPING;
  try {
    JSON.parse(mapping);
  } catch(e) {
    throw new errors.ChannelMappingError();
  }
};
