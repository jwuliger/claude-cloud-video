import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { verifyOutput } from '../scripts/verify-output.js';

const expectations = {
  width: 320,
  height: 180,
  fps: 30,
  duration: 1,
  sampleRate: 48000,
  minBitrate: 0,
};
/** @type {string} */
let directory;

/**
 * Make a one-second test clip with a chosen audio length.
 * @param {string} name
 * @param {number} audioSeconds
 * @returns {string}
 */
function makeClip(name, audioSeconds) {
  const path = join(directory, name);
  execFileSync('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-f',
    'lavfi',
    '-i',
    'testsrc=size=320x180:rate=30:duration=1',
    '-f',
    'lavfi',
    '-i',
    `sine=frequency=440:sample_rate=48000:duration=${audioSeconds}`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    path,
  ]);
  return path;
}

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), 'lml-verify-'));
});

afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('verifyOutput', () => {
  it('passes a clip whose audio and video lengths match', () => {
    const result = verifyOutput(makeClip('ok.mp4', 1), expectations);
    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('fails when the audio runs longer than the video', () => {
    const result = verifyOutput(makeClip('long-audio.mp4', 1.6), expectations);
    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toMatch(/Audio is/);
  });

  it('fails when the resolution is wrong', () => {
    const result = verifyOutput(makeClip('small.mp4', 1), {
      ...expectations,
      width: 3840,
      height: 2160,
    });
    expect(result.problems.join(' ')).toMatch(/Resolution/);
  });
});
