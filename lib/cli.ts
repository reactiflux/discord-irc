#!/usr/bin/env -S deno run -A

import { resolve as resolvePath } from 'path';
import { parse as parseCLI } from 'flags';
import * as helpers from './helpers.ts';
import { Config } from './config.ts';

async function run() {
  const opts = parseCLI(Deno.args, { alias: { c: 'config' } });

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
