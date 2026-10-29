/**
 * Renders single frames at chosen times for quick review.
 *
 *   node scripts/shots.js 1.8 4.5 8.2 [--scale 1] [--out build/review]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { captureFrame, launchBrowser, openFilm } from './lib/browser.js';
import { ROOT, startServer } from './lib/server.js';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    scale: { type: 'string', default: '2' },
    out: { type: 'string', default: join(ROOT, 'build/review') },
    gpu: { type: 'boolean', default: false },
  },
});

const outDir = values.out ?? join(ROOT, 'build/review');
mkdirSync(outDir, { recursive: true });
const server = await startServer();
const browser = await launchBrowser({ gpu: values.gpu });
const page = await openFilm(browser, server.url, Number(values.scale));
for (const label of positionals) {
  const png = await captureFrame(page, Number(label));
  const file = join(outDir, `t_${Number(label).toFixed(2).padStart(6, '0')}.png`);
  writeFileSync(file, png);
  process.stdout.write(`${file}\n`);
}
await browser.close();
await server.close();
