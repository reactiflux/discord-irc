var _ = require('lodash');
var errors = require('./errors');

exports.validateChannelMapping = function(mapping) {
  if (!_.isObject(mapping)) {
    throw new errors.ConfigurationError('Invalid channel mapping given');
  }

  _.each(mapping, function(slackChannel, ircChannel) {
    if (slackChannel[0] !== '#' || ircChannel[0] !== '#') {
      throw new errors.ConfigurationError('Invalid channel mapping given');
    }
  });

  return mapping;
};
