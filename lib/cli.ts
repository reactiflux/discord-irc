#!/usr/bin/env -S deno run -A

import { join } from 'path';
import { program } from 'npm:commander';
import * as helpers from './helpers.ts';
import { Config } from './config.ts';

async function run() {
  program
    .option(
      '-c, --config <path>',
      'Sets the path to the config file, otherwise read from the env variable CONFIG_FILE.',
    )
    .parse(Deno.args);

  const opts = program.opts();

  // Check if configFile.json exists in the current working directory
  const localConfigFile = join(Deno.cwd(), 'config.json');
  const localConfigExists = await helpers.exists(localConfigFile);

  // Determine the config file to use
  let configFile;
  if (opts.config) {
    configFile = opts.config;
  } else if (localConfigExists) {
    configFile = localConfigFile;
  } else if (Deno.env.get('CONFIG_FILE')) {
    configFile = Deno.env.get('CONFIG_FILE');
  } else {
    throw new Error('Missing environment variable CONFIG_FILE');
  }

  const completePath = configFile.startsWith('/')
    ? configFile
    : join(Deno.cwd(), configFile);
  const config = JSON.parse(
    new TextDecoder().decode(Deno.readFileSync(completePath)),
  ) as
    | Config
    | Config[];
  helpers.createBots(config);
}

export default run;
