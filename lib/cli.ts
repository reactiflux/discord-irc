#!/usr/bin/env -S deno run -A

import { parseCLI, resolvePath } from './deps.ts';
import * as helpers from './helpers.ts';
import { Config, parseConfigObject } from './config.ts';

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

  const configObj = JSON.parse(await Deno.readTextFile(configFilePath));
  const result = parseConfigObject(configObj);
  if (!result.success) {
    console.log('Error parsing configuration:');
    console.log(result.error);
    return;
  }
  const bots = helpers.createBots(result.data as Config | Config[]);
  // Graceful shutdown of network clients
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
