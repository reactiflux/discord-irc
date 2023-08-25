#!/usr/bin/env node

import fs from 'fs';
import program from 'commander';
import path from 'path';
import stripJsonComments from 'strip-json-comments';
import { endsWith } from 'lodash';
import * as helpers from './helpers';
import { ConfigurationError } from './errors';
import { version } from '../package.json';

function readJSONConfig(filePath) {
  const configFile = fs.readFileSync(filePath, { encoding: 'utf8' });
  try {
    return JSON.parse(stripJsonComments(configFile));
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new ConfigurationError(
        'The configuration file contains invalid JSON'
      );
    } else {
      throw err;
    }
  }
}

function run() {
  program
    .version(version)
    .option(
      '-c, --config <path>',
      'Sets the path to the config file, otherwise read from the env variable CONFIG_FILE.'
    )
    .parse(process.argv);

  const opts = program.opts();

  // Check if configFile.json exists in the current working directory
  const localConfigFile = path.resolve(process.cwd(), 'config.json');
  const localConfigExists = fs.existsSync(localConfigFile);

  // Determine the config file to use
  let configFile;
  if (opts.config) {
    configFile = opts.config;
  } else if (localConfigExists) {
    configFile = localConfigFile;
  } else if (process.env.CONFIG_FILE) {
    configFile = process.env.CONFIG_FILE;
  } else {
    throw new Error('Missing environment variable CONFIG_FILE');
  }

  const completePath = path.resolve(process.cwd(), configFile);
  const config = endsWith(configFile, '.js')
    ? import(completePath)
    : readJSONConfig(completePath);
  helpers.createBots(config);
}

export default run;
