#!/usr/bin/env -S deno run -A

import { createBots } from './helpers.ts';
import cli from './cli.ts';

/* istanbul ignore next */
if (import.meta.main) {
  await cli();
}

export default createBots;
