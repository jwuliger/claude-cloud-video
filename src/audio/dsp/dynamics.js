/** Dynamics: a linked stereo compressor, a ducking curve and a soft clipper. */

import { dbToGain, gainToDb } from './buffer.js';

/**
 * @typedef {object} CompressorOptions
 * @property {number} sampleRate
 * @property {number} thresholdDb
 * @property {number} ratio
 * @property {number} attack Seconds.
 * @property {number} release Seconds.
 * @property {number} [kneeDb]
 * @property {number} [makeupDb]
 */

/**
 * Feed-forward compressor with a soft knee, linked across both channels. Works in place.
 * @param {import('./buffer.js').Stereo} bus
 * @param {CompressorOptions} options
 */
export function compress(bus, options) {
  const { sampleRate, thresholdDb, ratio, attack, release, kneeDb = 6, makeupDb = 0 } = options;
  const attackCoefficient = Math.exp(-1 / (attack * sampleRate));
  const releaseCoefficient = Math.exp(-1 / (release * sampleRate));
  const makeup = dbToGain(makeupDb);
  let envelope = 0;
  for (let i = 0; i < bus.l.length; i += 1) {
    const level = Math.max(Math.abs(bus.l[i] ?? 0), Math.abs(bus.r[i] ?? 0));
    const coefficient = level > envelope ? attackCoefficient : releaseCoefficient;
    envelope = coefficient * envelope + (1 - coefficient) * level;
    const over = gainToDb(envelope) - thresholdDb;
    let reduction = 0;
    if (over > kneeDb / 2) {
      reduction = over * (1 - 1 / ratio);
    } else if (over > -kneeDb / 2) {
      reduction = ((1 - 1 / ratio) * (over + kneeDb / 2) ** 2) / (2 * kneeDb);
    }
    const gain = dbToGain(-reduction) * makeup;
    bus.l[i] = (bus.l[i] ?? 0) * gain;
    bus.r[i] = (bus.r[i] ?? 0) * gain;
  }
}

/**
 * Gain curve that dips on every trigger and recovers, like sidechain compression.
 * @param {number} frames
 * @param {readonly number[]} triggers Times in seconds.
 * @param {{ sampleRate: number, depth: number, release: number, attack?: number }} options
 *   `depth` 0-1 is the fraction removed at the trigger.
 * @returns {Float32Array}
 */
export function duckCurve(frames, triggers, options) {
  const { sampleRate, depth, release, attack = 0.004 } = options;
  const curve = new Float32Array(frames).fill(1);
  for (const time of triggers) {
    const start = Math.round(time * sampleRate);
    const length = Math.round(release * 5 * sampleRate);
    for (let n = 0; n < length && start + n < frames; n += 1) {
      const seconds = n / sampleRate;
      const dip = depth * Math.exp(-seconds / release) * Math.min(1, seconds / attack);
      const index = start + n;
      curve[index] = Math.min(curve[index] ?? 1, 1 - dip);
    }
  }
  return curve;
}

/**
 * Smooth saturation that rounds off peaks instead of clipping them. Works in place.
 * @param {import('./buffer.js').Stereo} bus
 * @param {number} drive Higher is more colour. 1 is almost transparent.
 */
export function softClip(bus, drive) {
  const norm = Math.tanh(drive);
  for (let i = 0; i < bus.l.length; i += 1) {
    bus.l[i] = Math.tanh((bus.l[i] ?? 0) * drive) / norm;
    bus.r[i] = Math.tanh((bus.r[i] ?? 0) * drive) / norm;
  }
}
