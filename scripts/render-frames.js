/**
 * Renders PNG frames of the film in parallel browsers. Resumable: existing frames are skipped.
 *
 *   node scripts/render-frames.js [--gpu] [--angle metal] [--workers 4] [--scale 2]
 *                                 [--range 0:600] [--force]
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { VIDEO } from '../src/config/video.config.js';
import { frameToSeconds, totalFrames } from '../src/core/timecode.js';
import { captureFrame, launchBrowser, openFilm } from './lib/browser.js';
import { ROOT, startServer } from './lib/server.js';

const { values } = parseArgs({
  options: {
    gpu: { type: 'boolean', default: false },
    angle: { type: 'string' },
    workers: { type: 'string', default: String(Math.min(4, cpus().length)) },
    scale: { type: 'string', default: String(VIDEO.width / VIDEO.layoutWidth) },
    range: { type: 'string' },
    force: { type: 'boolean', default: false },
    out: { type: 'string', default: join(ROOT, 'build/frames') },
  },
});

const frameCount = totalFrames(VIDEO.duration, VIDEO.fps);
const [firstFrame, endFrame] = values.range ? values.range.split(':').map(Number) : [0, frameCount];
const outDir = values.out ?? join(ROOT, 'build/frames');
const workerCount = Number(values.workers);
const scale = Number(values.scale);

/** @param {number} frame */
const framePath = (frame) => join(outDir, `f_${String(frame).padStart(6, '0')}.png`);

/**
 * @param {number} start
 * @param {number} end
 * @returns {number[]} Frames in [start, end) that still need rendering.
 */
function pendingFrames(start, end) {
  const frames = [];
  for (let frame = start; frame < end; frame += 1) {
    if (values.force || !existsSync(framePath(frame))) {
      frames.push(frame);
    }
  }
  return frames;
}

mkdirSync(outDir, { recursive: true });
const pending = pendingFrames(firstFrame ?? 0, endFrame ?? frameCount);
if (pending.length === 0) {
  process.stdout.write('All frames already rendered.\n');
  process.exit(0);
}

const server = await startServer();
const startedAt = Date.now();
let done = 0;

/**
 * @param {number[]} frames Contiguous chunk, so each worker only ever seeks forward.
 */
async function renderChunk(frames) {
  const browser = await launchBrowser({
    gpu: values.gpu,
    ...(values.angle ? { angle: values.angle } : {}),
  });
  const page = await openFilm(browser, server.url, scale);
  for (const frame of frames) {
    const png = await captureFrame(page, frameToSeconds(frame, VIDEO.fps));
    writeFileSync(framePath(frame), png);
    done += 1;
    if (done % 60 === 0 || done === pending.length) {
      const elapsed = (Date.now() - startedAt) / 1000;
      const eta = (elapsed / done) * (pending.length - done);
      process.stdout.write(
        `${done}/${pending.length} frames  ${elapsed.toFixed(0)}s elapsed  ~${eta.toFixed(0)}s left\n`,
      );
    }
  }
  await browser.close();
}

const chunkSize = Math.ceil(pending.length / workerCount);
const chunks = Array.from({ length: workerCount }, (_, i) =>
  pending.slice(i * chunkSize, (i + 1) * chunkSize),
);
await Promise.all(chunks.filter((chunk) => chunk.length > 0).map(renderChunk));
await server.close();
process.stdout.write(`Rendered ${pending.length} frames to ${outDir}\n`);
