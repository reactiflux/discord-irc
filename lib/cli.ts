#!/usr/bin/env -S deno run -A

import fs from 'node:fs';
import { program } from 'npm:commander';
import path from 'node:path';
import * as helpers from './helpers.ts';
import process from 'node:process';
import { Config } from './config.ts';

function run() {
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
  const config = JSON.parse(fs.readFileSync(completePath).toString()) as
    | Config
    | Config[];
  helpers.createBots(config);
}

export default run;
