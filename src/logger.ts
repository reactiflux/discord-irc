import winston, { format } from 'winston';
import { inspect } from 'util';

function simpleInspect(value) {
  if (typeof value === 'string') return value;
  return inspect(value, { depth: null });
}

function formatter(info) {
  const splat = info[Symbol.for('splat')] || [];
  const stringifiedRest =
    splat.length > 0 ? ` ${splat.map(simpleInspect).join(' ')}` : '';

  const padding = (info.padding && info.padding[info.level]) || '';
  return `${info.timestamp} ${info.level}:${padding} ${info.message}${stringifiedRest}`;
}

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    format.printf(formatter)
  ),
});

export default logger;
