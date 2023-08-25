import { parentPort } from 'worker_threads';
import Bot from './bot';

if (parentPort) {
  parentPort.on('message', (config) => {
    const bot = new Bot(config);
    bot.connect();
    parentPort?.postMessage({ status: 'connected' });
  });
}
