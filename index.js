#!/usr/bin/env node

var createBots = require('./lib/helpers').createBots;
var logger = require('winston');

/*istanbul ignore next*/
if (process.env.NODE_ENV === 'development') {
  logger.level = 'debug';
}

/* istanbul ignore next*/
if (!module.parent) {
  require('./lib/cli')();
}

module.exports = createBots;
