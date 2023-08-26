import Bot from './bot.ts';

self.onmessage = async (event) => {
  const bot = new Bot(event.data);
  await bot.connect();
  self.postMessage({ status: 'connected' });
};
