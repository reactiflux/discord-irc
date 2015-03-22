var _ = require('lodash');
var errors = require('./errors');

/**
 * Validates a given channel mapping, throwing an error if it's invalid
 * @param  {Object} mapping
 * @return {Object}
 */
exports.validateChannelMapping = function(mapping) {
  if (!_.isObject(mapping)) {
    throw new errors.ConfigurationError('Invalid channel mapping given');
  }

  return mapping;
};
