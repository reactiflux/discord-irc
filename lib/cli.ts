#!/usr/bin/env -S deno run -A

import { parseCLI, resolvePath } from './deps.ts';
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
  const bots = helpers.createBots(config);
  Deno.addSignalListener('SIGINT', async () => {
    bots[0].logger.warn('Received Ctrl+C! Disconnecting...');
    await helpers.forEachAsync(bots, async (bot) => {
      try {
        await bot.disconnect();
      } catch (e) {
        bots[0].logger.error(e);
      }
    });
    Deno.exit();
  });
  return bots;
}

export default run;
