import isObject from 'lodash-es/isObject.js';
// import { Worker } from 'node:worker_threads';
import { ConfigurationError } from './errors.ts';

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
      const botWorker = new Worker(
        new URL('./botWorker.ts', import.meta.url).href,
        { type: 'module' }
      );
      botWorker.postMessage(config);
      botWorker.onmessage = (event) => {
        if (event.data === 'connected') {
          bots.push(botWorker);
        }
      };
    });
  } else if (isObject(configFile)) {
    const botWorker = new Worker(
      new URL('./botWorker.ts', import.meta.url).href,
      { type: 'module' }
    );
    botWorker.postMessage(configFile);
    botWorker.onmessage = (event) => {
      if (event.data === 'connected') {
        bots.push(botWorker);
      }
    };
  } else {
    throw new ConfigurationError('');
  }

  return bots;
}
