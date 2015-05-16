var util = require('util');

function ConfigurationError(message) {
  this.name = 'ConfigurationError';
  this.message = message || 'Invalid configuration file given';
}

util.inherits(ConfigurationError, Error);
exports.ConfigurationError = ConfigurationError;
