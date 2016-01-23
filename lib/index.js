#!/usr/bin/env node

import { createBots } from './helpers';
import logger from 'winston';

/* istanbul ignore next */
if (process.env.NODE_ENV === 'development') {
  logger.level = 'debug';
}

/* istanbul ignore next */
if (!module.parent) {
  require('./cli').default();
}

export default createBots;
