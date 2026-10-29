/**
 * Finds "dead air": moments when almost nothing but the backdrop is on screen.
 *
 *   node scripts/qa-gaps.js [--step 0.05] [--min 0.2]
 *
 * Captions, the top bar and the footnote are ignored, so only scene content counts.
 */
import { parseArgs } from 'node:util';

import { PNG } from 'pngjs';

import { PALETTE, SCENES, VIDEO } from '../src/config/video.config.js';
import { hexToRgb } from '../src/core/color.js';
import { captureFrame, launchBrowser, openFilm } from './lib/browser.js';
import { startServer } from './lib/server.js';

const { values } = parseArgs({
  options: {
    step: { type: 'string', default: '0.05' },
    min: { type: 'string', default: '0.2' },
    below: { type: 'string' },
  },
});
const step = Number(values.step);
const minimumGap = Number(values.min);
const EMPTY_BELOW = Number(values.below ?? 0.0012);
const TOP_IGNORED = 0.1;
const BOTTOM_IGNORED = 0.2;

const background = hexToRgb(PALETTE.bg);

/**
 * @param {Buffer} png
 * @returns {number} Fraction of scene-area pixels that differ visibly from the backdrop.
 */
function sceneContent(png) {
  const image = PNG.sync.read(png);
  const from = Math.floor(image.height * TOP_IGNORED);
  const to = Math.floor(image.height * (1 - BOTTOM_IGNORED));
  let count = 0;
  for (let y = from; y < to; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const i = (y * image.width + x) * 4;
      const distance =
        Math.abs((image.data[i] ?? 0) - background[0]) +
        Math.abs((image.data[i + 1] ?? 0) - background[1]) +
        Math.abs((image.data[i + 2] ?? 0) - background[2]);
      count += distance > 30 ? 1 : 0;
    }
  }
  return count / (image.width * (to - from));
}

const server = await startServer();
const browser = await launchBrowser();
const page = await openFilm(browser, server.url, 0.5);
/** @type {{ start: number, end: number }[]} */
const gaps = [];
let open = -1;
for (let time = 0; time < VIDEO.duration; time += step) {
  const empty = sceneContent(await captureFrame(page, time)) < EMPTY_BELOW;
  if (empty && open < 0) {
    open = time;
  } else if (!empty && open >= 0) {
    gaps.push({ start: open, end: time });
    open = -1;
  }
}
await browser.close();
await server.close();

const long = gaps.filter((gap) => gap.end - gap.start >= minimumGap);
for (const gap of gaps) {
  const scene = SCENES.find(
    (candidate) => gap.start >= candidate.start && gap.start < candidate.end,
  );
  const flag = gap.end - gap.start >= minimumGap ? 'LONG' : '    ';
  process.stdout.write(
    `${flag} ${gap.start.toFixed(2)}s - ${gap.end.toFixed(2)}s (${(gap.end - gap.start).toFixed(2)}s) in ${scene?.id ?? '?'}\n`,
  );
}
process.stdout.write(`${long.length} gap(s) of ${minimumGap}s or more.\n`);
