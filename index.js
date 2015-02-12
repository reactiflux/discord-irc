#!/usr/bin/env node

var program = require('commander');
var checkEnv = require('check-env');
var logger = require('winston');

if (process.env.NODE_ENV !== 'production') {
  logger.level = 'debug';
}

program
  .version('1.1.0')
  .option('-c, --config <path>',
    'Sets the path to the config file, otherwise read from the env variable CONFIG_FILE.'
  )
  .parse(process.argv);

// If no config option is given, try to use the env variable:
if (!program.config) checkEnv(['CONFIG_FILE']);
else process.env.CONFIG_FILE = program.config;

var app = require('./lib/server');
app.listen(app.get('port'), function() {
  logger.debug('Listening on port %d', app.get('port'));
});
