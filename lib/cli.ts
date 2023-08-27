#!/usr/bin/env -S deno run -A

import { resolve as resolvePath } from 'path';
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

  let configFilePath: string;
  if (opts.config) {
    configFilePath = opts.config;
  } else {
    configFilePath = Deno.env.get('CONFIG_FILE') ?? './config.json';
  }
  configFilePath = resolvePath(configFilePath);

  if (!await helpers.exists(configFilePath)) {
    throw new Error('Config file could not be found.');
  }

  const config = JSON.parse(await Deno.readTextFile(configFilePath)) as
    | Config
    | Config[];
  helpers.createBots(config);
}

export default run;
