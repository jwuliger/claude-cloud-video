/**
 * Encodes the rendered PNG frames and the mastered audio into the final MP4.
 *
 *   node scripts/encode.js [--frames build/frames] [--out dist/film.mp4] [--crf 10] [--preset slow]
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';

import { VIDEO } from '../src/config/video.config.js';
import { MASTER_PATH } from './build-audio.js';
import { ROOT } from './lib/server.js';
import { DEFAULT_OUTPUT } from './verify-output.js';

/** Visually lossless for this content; lower is higher quality and a higher bitrate. */
const DEFAULT_CRF = '10';

const { values } = parseArgs({
  options: {
    frames: { type: 'string', default: join(ROOT, 'build/frames') },
    out: { type: 'string', default: DEFAULT_OUTPUT },
    crf: { type: 'string', default: DEFAULT_CRF },
    preset: { type: 'string', default: 'slow' },
  },
});

const output = values.out ?? DEFAULT_OUTPUT;
mkdirSync(dirname(output), { recursive: true });

/** RGB frames become limited-range BT.709 YUV, the standard for HD and UHD video. */
const colourFilter =
  'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p';

const args = [
  '-y',
  '-hide_banner',
  '-framerate',
  String(VIDEO.fps),
  '-i',
  join(values.frames ?? '', 'f_%06d.png'),
  '-i',
  MASTER_PATH,
  '-t',
  String(VIDEO.duration),
  '-vf',
  colourFilter,
  '-c:v',
  'libx264',
  '-preset',
  values.preset ?? 'slow',
  '-crf',
  values.crf ?? DEFAULT_CRF,
  '-profile:v',
  'high',
  '-level:v',
  '5.2',
  '-g',
  String(VIDEO.fps * 2),
  '-bf',
  '3',
  '-maxrate',
  '140M',
  '-bufsize',
  '280M',
  // Dark, flat frames with hairlines: protect them from the encoder's smoothing.
  '-x264-params',
  'aq-mode=3:aq-strength=0.9:deblock=-1,-1:chroma-qp-offset=-3:rc-lookahead=60',
  '-colorspace',
  'bt709',
  '-color_primaries',
  'bt709',
  '-color_trc',
  'bt709',
  '-color_range',
  'tv',
  '-c:a',
  'aac',
  '-b:a',
  '320k',
  '-ar',
  '48000',
  '-movflags',
  '+faststart',
  output,
];

const result = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (result.status !== 0) {
  throw new Error('ffmpeg failed to encode the film.');
}
process.stdout.write(`Wrote ${output}\n`);
