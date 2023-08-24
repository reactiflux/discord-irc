#!/usr/bin/env node

import { createBots } from './helpers';

/* istanbul ignore next */
if (!module.parent) {
  require('./cli').default();
}

export default createBots;
