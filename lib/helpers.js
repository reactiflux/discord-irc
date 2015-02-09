var _ = require('lodash');
var path = require('path');
var Bot = require('./bot');
var errors = require('./errors');

/**
 * Reads from the provided config file and returns an array of bots
 * @return {object[]}
 */
exports.createBots = function() {
  var configFile = require(path.resolve(process.cwd(), process.env.CONFIG_FILE));
  var bots = [];

  // The config file can be both an array and an object
  if (Array.isArray(configFile)) {
    configFile.forEach(function(config) {
      var bot = new Bot(config);
      bots.push(bot);
    });
  } else if (_.isObject(configFile)) {
    var bot = new Bot(configFile);
    bots.push(bot);
  } else {
    throw new errors.ConfigurationError();
  }

  return bots;
};
