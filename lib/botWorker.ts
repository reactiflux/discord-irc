import Bot from './bot.ts';
import { Config } from './config.ts';

self.onmessage = async (event: MessageEvent<Config>) => {
  const bot = new Bot(event.data);
  await bot.connect();
  self.postMessage({ status: 'connected' });
};
