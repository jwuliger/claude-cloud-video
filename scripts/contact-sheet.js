/**
 * Tiles review frames into one image so many moments can be checked at a glance.
 *
 *   node scripts/contact-sheet.js out.png a.png b.png c.png d.png [--cols 2] [--width 1920]
 */
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { cols: { type: 'string', default: '2' }, width: { type: 'string', default: '1920' } },
});

const [output, ...inputs] = positionals;
if (!output || inputs.length === 0) {
  throw new Error('Usage: contact-sheet.js out.png frame1.png frame2.png ...');
}
const columns = Number(values.cols);
const cellWidth = Math.floor(Number(values.width) / columns);
const cellHeight = Math.round((cellWidth * 9) / 16);
const rows = Math.ceil(inputs.length / columns);

const scaled = inputs.map(
  (_, i) => `[${i}:v]scale=${cellWidth}:${cellHeight}:flags=lanczos[s${i}]`,
);
const layout = inputs.map(
  (_, i) => `${(i % columns) * cellWidth}_${Math.floor(i / columns) * cellHeight}`,
);
const filter = `${scaled.join(';')};${inputs.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${inputs.length}:layout=${layout.join('|')}:fill=black[out]`;

const args = [
  '-y',
  '-loglevel',
  'error',
  ...inputs.flatMap((file) => ['-i', file]),
  '-filter_complex',
  filter,
  '-map',
  '[out]',
  '-frames:v',
  '1',
  output,
];
const result = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (result.status !== 0) {
  throw new Error(`ffmpeg failed (${rows} rows).`);
}
