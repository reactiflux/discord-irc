#!/usr/bin/env node

import program from 'commander';
import path from 'path';
import checkEnv from 'check-env';
import { createBots } from './helpers';

function run() {
  program
    .version(require('../package.json').version)
    .option('-c, --config <path>',
      'Sets the path to the config file, otherwise read from the env variable CONFIG_FILE.'
    )
    .parse(process.argv);

  // If no config option is given, try to use the env variable:
  if (!program.config) checkEnv(['CONFIG_FILE']);
  else process.env.CONFIG_FILE = program.config;

  const configFile = require(path.resolve(process.cwd(), process.env.CONFIG_FILE));
  createBots(configFile);
}

export default run;
