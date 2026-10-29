/** Oscillators and noise. Everything is deterministic: noise comes from a seeded generator. */

import { createRng } from '../../core/rng.js';

const TAU = Math.PI * 2;

/**
 * Anti-aliasing correction for a sawtooth discontinuity (polyBLEP).
 * @param {number} phase 0-1
 * @param {number} increment Phase advance per sample.
 * @returns {number}
 */
function polyBlep(phase, increment) {
  if (phase < increment) {
    const t = phase / increment;
    return t + t - t * t - 1;
  }
  if (phase > 1 - increment) {
    const t = (phase - 1) / increment;
    return t * t + t + t + 1;
  }
  return 0;
}

/**
 * Band-limited sawtooth.
 * @param {number} frames
 * @param {number} hz
 * @param {number} sampleRate
 * @param {number} [startPhase] 0-1
 * @returns {Float32Array} Values in [-1, 1].
 */
export function saw(frames, hz, sampleRate, startPhase = 0) {
  const out = new Float32Array(frames);
  const increment = hz / sampleRate;
  let phase = startPhase % 1;
  for (let i = 0; i < frames; i += 1) {
    out[i] = 2 * phase - 1 - polyBlep(phase, increment);
    phase += increment;
    if (phase >= 1) {
      phase -= 1;
    }
  }
  return out;
}

/**
 * Sine with an optional per-sample frequency curve, for pitch sweeps.
 * @param {number} frames
 * @param {number | ((index: number) => number)} hz Constant or per-sample frequency.
 * @param {number} sampleRate
 * @param {number} [startPhase] Radians.
 * @returns {Float32Array}
 */
export function sine(frames, hz, sampleRate, startPhase = 0) {
  const out = new Float32Array(frames);
  let phase = startPhase;
  for (let i = 0; i < frames; i += 1) {
    out[i] = Math.sin(phase);
    phase += (TAU * (typeof hz === 'function' ? hz(i) : hz)) / sampleRate;
  }
  return out;
}

/**
 * Triangle wave.
 * @param {number} frames
 * @param {number} hz
 * @param {number} sampleRate
 * @returns {Float32Array}
 */
export function triangle(frames, hz, sampleRate) {
  const out = new Float32Array(frames);
  const increment = hz / sampleRate;
  let phase = 0;
  for (let i = 0; i < frames; i += 1) {
    out[i] = 4 * Math.abs(phase - 0.5) - 1;
    phase = (phase + increment) % 1;
  }
  return out;
}

/**
 * Seeded white noise.
 * @param {number} frames
 * @param {number} seed
 * @returns {Float32Array} Values in [-1, 1].
 */
export function whiteNoise(frames, seed) {
  const rng = createRng(seed);
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) {
    out[i] = rng() * 2 - 1;
  }
  return out;
}

/**
 * Exponential decay envelope.
 * @param {number} frames
 * @param {number} timeConstant Seconds to fall to 1/e.
 * @param {number} sampleRate
 * @param {number} [attack] Seconds of linear fade-in, to avoid clicks.
 * @returns {Float32Array}
 */
export function decayEnvelope(frames, timeConstant, sampleRate, attack = 0.002) {
  const out = new Float32Array(frames);
  const attackFrames = Math.max(1, Math.round(attack * sampleRate));
  for (let i = 0; i < frames; i += 1) {
    const fall = Math.exp(-i / (timeConstant * sampleRate));
    out[i] = fall * Math.min(1, i / attackFrames);
  }
  return out;
}

/**
 * Attack-sustain-release envelope with smooth (raised cosine) ramps.
 * @param {number} frames
 * @param {number} attack Seconds.
 * @param {number} release Seconds.
 * @param {number} sampleRate
 * @returns {Float32Array}
 */
export function swellEnvelope(frames, attack, release, sampleRate) {
  const out = new Float32Array(frames);
  const attackFrames = Math.max(1, Math.round(attack * sampleRate));
  const releaseFrames = Math.max(1, Math.round(release * sampleRate));
  for (let i = 0; i < frames; i += 1) {
    const rise = Math.min(1, i / attackFrames);
    const fall = Math.min(1, (frames - 1 - i) / releaseFrames);
    out[i] = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(rise, fall));
  }
  return out;
}

/**
 * Multiply a clip by an envelope, in place.
 * @param {Float32Array} clip
 * @param {Float32Array} envelope
 * @returns {Float32Array} The same clip.
 */
export function shape(clip, envelope) {
  for (let i = 0; i < clip.length; i += 1) {
    clip[i] = (clip[i] ?? 0) * (envelope[i] ?? 0);
  }
  return clip;
}
