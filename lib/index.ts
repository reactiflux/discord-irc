#!/usr/bin/env -S deno run -A

import cli from './cli.ts';
import { createBots } from './helpers.ts';

/* istanbul ignore next */
if (import.meta.main) {
  cli();
}

export default createBots;
