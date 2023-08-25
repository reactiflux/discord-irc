import _ from 'lodash';
import { Worker } from 'worker_threads';
import { ConfigurationError } from './errors';

/**
 * Reads from the provided config file and returns an array of bots
 * @return {object[]}
 */
export function createBots(configFile: any[]): object[] {
  const bots: Worker[] = [];

  // The config file can be both an array and an object
  // The config file can be both an array and an object
  if (Array.isArray(configFile)) {
    configFile.forEach((config) => {
      const botWorker = new Worker('./src/botWorker.ts');
      botWorker.postMessage(config);
      botWorker.on('message', (event) => {
        if (event.status === 'connected') {
          bots.push(botWorker);
        }
      });
    });
  } else if (_.isObject(configFile)) {
    const botWorker = new Worker('./src/botWorker.ts');
    botWorker.postMessage(configFile);
    botWorker.on('message', (event) => {
      if (event.status === 'connected') {
        bots.push(botWorker);
      }
    });
  } else {
    throw new ConfigurationError('');
  }

  return bots;
}
