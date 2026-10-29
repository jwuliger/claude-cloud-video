/** Thin wrappers around the ffmpeg and ffprobe command line tools. */
import { execFileSync, spawnSync } from 'node:child_process';

/**
 * Run ffmpeg and return its stderr text (where it prints measurements).
 * @param {readonly string[]} args
 * @returns {string}
 */
export function ffmpegStderr(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed:\n${result.stderr}`);
  }
  return result.stderr;
}

/**
 * Decode any audio file to 32-bit float samples at a given rate, as one channel.
 * @param {string} path
 * @param {number} sampleRate
 * @returns {Float32Array}
 */
export function decodeMono(path, sampleRate) {
  const bytes = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', path, '-ac', '1', '-ar', String(sampleRate), '-f', 'f32le', '-'],
    { maxBuffer: 512 * 1024 * 1024 },
  );
  const copy = new Uint8Array(bytes);
  return new Float32Array(copy.buffer, 0, Math.floor(copy.byteLength / 4));
}

/**
 * Integrated loudness (LUFS) and sample peak (dBFS) of an audio file.
 * @param {string} path
 * @returns {{ lufs: number, peakDb: number }}
 */
export function measureLoudness(path) {
  const text = ffmpegStderr(['-i', path, '-af', 'ebur128=peak=sample', '-f', 'null', '-']);
  const summary = text.slice(text.lastIndexOf('Summary:'));
  const lufs = /I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1];
  const peak = /Peak:\s+(-?[\d.]+) dBFS/.exec(summary)?.[1];
  if (lufs === undefined || peak === undefined) {
    throw new Error(`Could not read loudness of ${path}`);
  }
  return { lufs: Number(lufs), peakDb: Number(peak) };
}

/**
 * Duration in seconds of the first stream of a given type.
 * @param {string} path
 * @param {'audio' | 'video'} kind
 * @returns {number}
 */
export function streamDuration(path, kind) {
  const selector = kind === 'audio' ? 'a:0' : 'v:0';
  const output = execFileSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', selector, '-show_entries', 'stream=duration', '-of', 'csv=p=0', path],
    { encoding: 'utf8' },
  );
  return Number(output.trim());
}
