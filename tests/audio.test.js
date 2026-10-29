import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import manifest from '../assets/audio/vo/manifest.json' with { type: 'json' };
import { readWavInfo, readWavMono } from '../src/audio/dsp/wav.js';
import { filterInPlace } from '../src/audio/dsp/filters.js';
import { duckCurve, compress } from '../src/audio/dsp/dynamics.js';
import { reverb } from '../src/audio/dsp/reverb.js';
import { whiteNoise } from '../src/audio/dsp/osc.js';
import { kick } from '../src/audio/voices.js';
import { AUDIO, CUES, VIDEO, VOICEOVER } from '../src/config/video.config.js';
import { resolveCues } from '../src/core/cues.js';
import { resolveVoiceover } from '../src/core/voiceover.js';
import { AUDIO_DIR, buildAudio } from '../scripts/build-audio.js';
import { measureLoudness } from '../scripts/lib/ffmpeg.js';

const sampleRate = AUDIO.sampleRate;
const lines = resolveVoiceover(VOICEOVER.lines, manifest);
const cues = resolveCues(CUES, lines);

/**
 * RMS level in dBFS of a time window.
 * @param {Float32Array} samples
 * @param {number} from Seconds.
 * @param {number} to Seconds.
 * @returns {number}
 */
function rmsDb(samples, from, to) {
  const segment = samples.subarray(Math.round(from * sampleRate), Math.round(to * sampleRate));
  const power = segment.reduce((sum, value) => sum + value * value, 0) / segment.length;
  return 10 * Math.log10(power + 1e-12);
}

/**
 * Time of the sharpest rise in loudness inside a window: where a hit starts. The estimate is the
 * end of the measuring window, so it can only be late by about one `hop`.
 * @param {Float32Array} samples
 * @param {number} from Seconds.
 * @param {number} to Seconds.
 * @param {number} [window] Length of each loudness measurement. Must span a few cycles.
 * @returns {number}
 */
function onsetTime(samples, from, to, window = 0.004) {
  const hop = 0.001;
  let best = from;
  let bestRise = -Infinity;
  for (let end = from + window + hop; end < to; end += hop) {
    const rise = rmsDb(samples, end - window, end) - rmsDb(samples, end - window - hop, end - hop);
    if (rise > bestRise) {
      bestRise = rise;
      best = end;
    }
  }
  return best;
}

describe('built audio', () => {
  /** @type {ReturnType<typeof buildAudio>} */
  let built;
  beforeAll(() => {
    built = buildAudio();
  });

  it('is exactly as long as the film', () => {
    const info = readWavInfo(built.master);
    expect(info.sampleRate).toBe(sampleRate);
    expect(info.channels).toBe(2);
    expect(info.frames).toBe(VIDEO.duration * sampleRate);
  });

  it('is mastered to the target loudness with true-peak headroom', () => {
    const { lufs, peakDb } = measureLoudness(built.master);
    expect(Math.abs(lufs - AUDIO.loudness.final)).toBeLessThan(0.6);
    expect(peakDb).toBeLessThanOrEqual(AUDIO.loudness.truePeak + 0.1);
  });

  it('puts the narration where the script says, with silence before each line', () => {
    const { samples } = readWavMono(join(AUDIO_DIR, 'voice.wav'));
    for (const line of lines) {
      expect(rmsDb(samples, line.at + 0.1, line.end - 0.1), `${line.id} speech`).toBeGreaterThan(
        -45,
      );
      expect(rmsDb(samples, line.at - 0.2, line.at - 0.03), `${line.id} lead-in`).toBeLessThan(-60);
    }
  });

  it('lands the hits on the visual drops', () => {
    const { samples } = readWavMono(join(AUDIO_DIR, 'sfx.wav'));
    for (const name of ['product.drop', 'cta.drop']) {
      const drop = cues[name] ?? 0;
      expect(Math.abs(onsetTime(samples, drop - 0.1, drop + 0.1) - drop), name).toBeLessThan(0.012);
    }
  });

  it('lands the kick and bass on the same beat grid as the picture', () => {
    const { samples } = readWavMono(join(AUDIO_DIR, 'music.wav'));
    const low = Float32Array.from(samples);
    filterInPlace(low, 'lowpass', 150, sampleRate);
    for (const beat of [20, 30.5, 44]) {
      expect(
        Math.abs(onsetTime(low, beat - 0.12, beat + 0.12, 0.012) - beat),
        `beat ${beat}`,
      ).toBeLessThan(0.02);
    }
  });
});

describe('dsp building blocks', () => {
  it('a kick starts immediately and stays within full scale', () => {
    const clip = kick({ sampleRate, seed: 1 });
    const early = clip.subarray(0, Math.round(0.01 * sampleRate));
    expect(Math.max(...early.map(Math.abs))).toBeGreaterThan(0.2);
    expect(Math.max(...clip.map(Math.abs))).toBeLessThanOrEqual(1);
  });

  it('a low-pass filter removes high frequencies more than low ones', () => {
    const noise = whiteNoise(sampleRate, 3);
    const filtered = Float32Array.from(noise);
    filterInPlace(filtered, 'lowpass', 500, sampleRate);
    const high = Float32Array.from(filtered);
    filterInPlace(high, 'highpass', 4000, sampleRate);
    const energy = (/** @type {Float32Array} */ a) => a.reduce((sum, v) => sum + v * v, 0);
    expect(energy(high)).toBeLessThan(energy(filtered) * 0.01);
  });

  it('a compressor turns loud peaks down', () => {
    const loud = {
      l: new Float32Array(sampleRate).fill(0.9),
      r: new Float32Array(sampleRate).fill(0.9),
    };
    compress(loud, { sampleRate, thresholdDb: -20, ratio: 4, attack: 0.001, release: 0.05 });
    expect(loud.l[sampleRate - 1] ?? 1).toBeLessThan(0.5);
  });

  it('ducking dips at a trigger and recovers', () => {
    const curve = duckCurve(sampleRate, [0.5], { sampleRate, depth: 0.5, release: 0.1 });
    expect(curve[0]).toBe(1);
    expect(curve[Math.round(0.52 * sampleRate)] ?? 1).toBeLessThan(0.7);
    expect(curve[sampleRate - 1] ?? 0).toBeGreaterThan(0.99);
  });

  it('a reverb rings after the input stops and then dies away', () => {
    const frames = sampleRate * 4;
    const input = { l: new Float32Array(frames), r: new Float32Array(frames) };
    input.l[0] = 1;
    input.r[0] = 1;
    const wet = reverb(input, { sampleRate, rt60: 1.2 });
    const at = (/** @type {number} */ from, /** @type {number} */ to) => rmsDb(wet.l, from, to);
    expect(at(0.2, 0.5)).toBeGreaterThan(-90);
    expect(at(3.5, 3.9)).toBeLessThan(at(0.2, 0.5) - 20);
  });
});
