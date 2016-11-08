#!/usr/bin/env node

import logger from 'winston';
import { createBots } from './helpers';

/* istanbul ignore next */
if (process.env.NODE_ENV === 'development') {
  logger.level = 'debug';
}

/* istanbul ignore next */
if (!module.parent) {
  require('./cli').default();
}

export default createBots;
