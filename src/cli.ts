#!/usr/bin/env node

import fs from 'node:fs';
import { program } from 'npm:commander';
import path from 'node:path';
import stripJsonComments from 'npm:strip-json-comments';
import * as helpers from './helpers.ts';
import { ConfigurationError } from './errors.ts';
import process from 'node:process';

function readJSONConfig(filePath: string) {
  const configFile = fs.readFileSync(filePath, { encoding: 'utf8' });
  try {
    return JSON.parse(stripJsonComments(configFile));
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new ConfigurationError(
        'The configuration file contains invalid JSON',
      );
    } else {
      throw err;
    }
  }
}

async function run() {
  program
    .option(
      '-c, --config <path>',
      'Sets the path to the config file, otherwise read from the env variable CONFIG_FILE.',
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
  const config = configFile.endsWith('.js')
    ? await import(completePath)
    : readJSONConfig(completePath);
  helpers.createBots(config);
}

export default run;
