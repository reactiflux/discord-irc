//import { parentPort } from 'node:worker_threads';
import Bot from './bot.ts';

self.onmessage = async (event) => {
  const bot = new Bot(event.data);
  await bot.connect();
  self.postMessage({ status: 'connected' });
};

// if (parentPort) {
//   parentPort.on('message', (config) => {
//     const bot = new Bot(config);
//     bot.connect();
//     parentPort?.postMessage({ status: 'connected' });
//   });
// }
