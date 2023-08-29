#!/usr/bin/env -S deno run -A

import { parseCLI, resolvePath } from './deps.ts';
import * as helpers from './helpers.ts';
import { Config, parseConfigObject } from './config.ts';

function testIrcOptions(obj: any): string | null {
  if ('userName' in obj) {
    return 'You must provide username not userName!';
  }
  if ('realName' in obj) {
    return 'You must provide realname not realName!';
  }
  if ('retryCount' in obj) {
    return 'You cannot use retryCount, use the sane defaults or read the documentation';
  }
  if ('retryDelay' in obj) {
    return 'You cannot use retryDelay, use the sane defaults or read the documentation';
  }
  if ('floodProtection' in obj) {
    return 'flood protection is enabled by default and cannot be disabled';
  }
  return null;
}

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
  let config: Config | Config[] | null = null;
  // May still fail if invalid ircOptions
  if (Array.isArray(result.data)) {
    const valid = result.data.reduce((acc, config) => {
      const ircOptionsTestResult = testIrcOptions(config.ircOptions);
      if (ircOptionsTestResult !== null) {
        console.log('Error parsing ircOptions:');
        console.log(ircOptionsTestResult);
        return false;
      }
      return acc;
    }, true);
    if (valid) {
      config = result.data as Config[];
    }
  } else {
    const ircOptionsTestResult = testIrcOptions(result.data.ircOptions);
    if (ircOptionsTestResult !== null) {
      console.log('Error parsing ircOptions:');
      console.log(ircOptionsTestResult);
    } else {
      config = result.data as Config;
    }
  }
  if (!config) {
    console.log('Cannot start due to invalid configuration');
    return;
  }
  const bots = helpers.createBots(config);
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
