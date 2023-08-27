#!/usr/bin/env -S deno run -A

import { createBots } from './helpers.ts';

/* istanbul ignore next */
if (import.meta.main) {
  await (await import('./cli.ts')).default();
}

export default createBots;
