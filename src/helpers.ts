import { ConfigurationError } from './errors.ts';

export function invert(obj: any) {
  // WARNING: This is not a drop in replacement solution and
  // it might not work for some edge cases. Test your code!
  return Object.entries(obj).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [value as string]: key,
    }),
    {},
  );
}

export function isObject(a: any) {
  return a instanceof Object;
}

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
        { type: 'module' },
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
      { type: 'module' },
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
