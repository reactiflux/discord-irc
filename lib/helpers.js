var _ = require('lodash');
var errors = require('./errors');

exports.validateChannelMapping = function() {
  var mapping = process.env.CHANNEL_MAPPING;
  try {
    mapping = JSON.parse(mapping);
  } catch(e) {
    throw new errors.ChannelMappingError();
  }

  _.each(mapping, function(slackChannel, ircChannel) {
    if (slackChannel[0] !== '#' || ircChannel[0] !== '#') {
      throw new errors.ChannelMappingError;
    }
  });
};
