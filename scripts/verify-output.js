/**
 * Checks a finished MP4 against the brief: 4K, frame rate, synced audio and video, bitrate.
 *
 *   node scripts/verify-output.js [path/to/film.mp4]
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { AUDIO, VIDEO } from '../src/config/video.config.js';
import { ROOT } from './lib/server.js';

export const DEFAULT_OUTPUT = `${ROOT}/dist/live-motion-labs-launch-4k.mp4`;
/** Bitrate floor that keeps thin lines and small text sharp at 4K. */
const MIN_BITS_PER_SECOND = 20_000_000;

/**
 * @typedef {object} Expectations
 * @property {number} width
 * @property {number} height
 * @property {number} fps
 * @property {number} duration Seconds.
 * @property {number} sampleRate
 * @property {number} minBitrate Bits per second.
 */

/** @type {Expectations} */
export const FILM_EXPECTATIONS = {
  width: VIDEO.width,
  height: VIDEO.height,
  fps: VIDEO.fps,
  duration: VIDEO.duration,
  sampleRate: AUDIO.sampleRate,
  minBitrate: MIN_BITS_PER_SECOND,
};

/**
 * @param {string} rate ffprobe fraction such as "60/1".
 * @returns {number}
 */
function parseRate(rate) {
  const [top = 0, bottom = 1] = rate.split('/').map(Number);
  return top / bottom;
}

/**
 * @param {string} path
 * @returns {{ video: Record<string, string>, audio: Record<string, string>, format: Record<string, string> }}
 */
export function probe(path) {
  const json = JSON.parse(
    execFileSync(
      'ffprobe',
      ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', path],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    ),
  );
  const find = (/** @type {string} */ type) =>
    json.streams.find((/** @type {{ codec_type: string }} */ s) => s.codec_type === type) ?? {};
  return { video: find('video'), audio: find('audio'), format: json.format };
}

/**
 * @param {string} path
 * @param {Expectations} [expected]
 * @returns {{ ok: boolean, problems: string[], facts: Record<string, string | number> }}
 */
export function verifyOutput(path, expected = FILM_EXPECTATIONS) {
  const { video, audio, format } = probe(path);
  const problems = [];
  const fps = parseRate(video['r_frame_rate'] ?? '0/1');
  const videoSeconds = Number(video['duration']);
  const audioSeconds = Number(audio['duration']);
  const frames = Number(video['nb_read_frames']);
  const bitrate = Number(format['bit_rate']);
  const frameTime = 1 / expected.fps;

  if (Number(video['width']) !== expected.width || Number(video['height']) !== expected.height) {
    problems.push(
      `Resolution is ${video['width']}x${video['height']}, expected ${expected.width}x${expected.height}.`,
    );
  }
  if (Math.abs(fps - expected.fps) > 0.01) {
    problems.push(`Frame rate is ${fps}, expected ${expected.fps}.`);
  }
  if (frames !== Math.round(expected.duration * expected.fps)) {
    problems.push(
      `Has ${frames} frames, expected ${Math.round(expected.duration * expected.fps)}.`,
    );
  }
  if (Math.abs(audioSeconds - videoSeconds) > frameTime) {
    problems.push(
      `Audio is ${audioSeconds}s but video is ${videoSeconds}s (more than one frame apart).`,
    );
  }
  if (Math.abs(videoSeconds - expected.duration) > frameTime) {
    problems.push(`Video lasts ${videoSeconds}s, expected ${expected.duration}s.`);
  }
  if (Number(audio['sample_rate']) !== expected.sampleRate) {
    problems.push(`Audio sample rate is ${audio['sample_rate']}, expected ${expected.sampleRate}.`);
  }
  if (bitrate < expected.minBitrate) {
    problems.push(
      `Bitrate is ${(bitrate / 1e6).toFixed(1)} Mbps, below ${(expected.minBitrate / 1e6).toFixed(0)} Mbps.`,
    );
  }
  if (video['pix_fmt'] !== 'yuv420p') {
    problems.push(`Pixel format is ${video['pix_fmt']}; yuv420p plays everywhere.`);
  }
  const facts = {
    resolution: `${video['width']}x${video['height']}`,
    fps,
    frames,
    videoSeconds,
    audioSeconds,
    megabitsPerSecond: Number((bitrate / 1e6).toFixed(1)),
    videoCodec: video['codec_name'] ?? '',
    audioCodec: audio['codec_name'] ?? '',
  };
  return { ok: problems.length === 0, problems, facts };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = verifyOutput(process.argv[2] ?? DEFAULT_OUTPUT);
  process.stdout.write(`${JSON.stringify(result.facts, null, 2)}\n`);
  if (!result.ok) {
    process.stderr.write(`${result.problems.join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write('All output checks passed.\n');
}
