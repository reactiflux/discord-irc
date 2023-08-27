import { Config } from './config.ts';
import Bot from './bot.ts';

self.onmessage = async (event: MessageEvent<Config>) => {
  const bot = new Bot(event.data);
  await bot.connect();
  self.postMessage({ status: 'connected' });
};
