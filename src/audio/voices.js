/** Instrument voices: each function renders one note or hit into a mono Float32Array. */

import { TAU } from '../core/math.js';
import { filterInPlace, sweepBandpass, sweepLowpass } from './dsp/filters.js';
import { decayEnvelope, saw, shape, sine, swellEnvelope, triangle, whiteNoise } from './dsp/osc.js';

/** @typedef {{ sampleRate: number }} VoiceContext */

/**
 * Convert seconds to a whole number of frames.
 * @param {number} seconds
 * @param {number} sampleRate
 * @returns {number}
 */
export function frames(seconds, sampleRate) {
  return Math.max(1, Math.round(seconds * sampleRate));
}

/**
 * Soft kick: a sine that falls from a punchy pitch to a deep fundamental, plus a tiny click.
 * @param {VoiceContext & { seed: number, weight?: number }} v
 * @returns {Float32Array}
 */
export function kick(v) {
  const { sampleRate, seed, weight = 1 } = v;
  const length = frames(0.5, sampleRate);
  const pitch = (/** @type {number} */ i) => 54 + 110 * Math.exp(-i / (0.026 * sampleRate));
  const body = sine(length, pitch, sampleRate, Math.PI / 2);
  shape(body, decayEnvelope(length, 0.1 * weight + 0.03, sampleRate, 0.0015));
  const click = whiteNoise(frames(0.006, sampleRate), seed);
  filterInPlace(click, 'highpass', 1800, sampleRate);
  for (let i = 0; i < click.length; i += 1) {
    body[i] = (body[i] ?? 0) + (click[i] ?? 0) * 0.16 * Math.exp(-i / (0.0015 * sampleRate));
  }
  for (let i = 0; i < length; i += 1) {
    body[i] = Math.tanh((body[i] ?? 0) * 1.5) * 0.9;
  }
  return body;
}

/**
 * Closed or open hi-hat from filtered noise.
 * @param {VoiceContext & { seed: number, open?: boolean }} v
 * @returns {Float32Array}
 */
export function hat(v) {
  const { sampleRate, seed, open = false } = v;
  const length = frames(open ? 0.35 : 0.09, sampleRate);
  const noise = whiteNoise(length, seed);
  filterInPlace(noise, 'highpass', 6500, sampleRate, { q: 0.8 });
  filterInPlace(noise, 'peaking', 10500, sampleRate, { q: 1.2, gainDb: 5 });
  return shape(noise, decayEnvelope(length, open ? 0.07 : 0.018, sampleRate, 0.0008));
}

/**
 * Soft shaker: band-limited noise with a gentle attack.
 * @param {VoiceContext & { seed: number }} v
 * @returns {Float32Array}
 */
export function shaker(v) {
  const { sampleRate, seed } = v;
  const length = frames(0.07, sampleRate);
  const noise = whiteNoise(length, seed);
  filterInPlace(noise, 'bandpass', 7000, sampleRate, { q: 1.1 });
  return shape(noise, decayEnvelope(length, 0.022, sampleRate, 0.006));
}

/**
 * Clap: three tight noise bursts and a short tail.
 * @param {VoiceContext & { seed: number }} v
 * @returns {Float32Array}
 */
export function clap(v) {
  const { sampleRate, seed } = v;
  const length = frames(0.28, sampleRate);
  const out = new Float32Array(length);
  [0, 0.011, 0.023].forEach((offset, index) => {
    const burst = whiteNoise(frames(0.035, sampleRate), seed + index);
    shape(burst, decayEnvelope(burst.length, 0.008, sampleRate, 0.0006));
    const start = frames(offset, sampleRate);
    burst.forEach((value, i) => {
      out[start + i] = (out[start + i] ?? 0) + value * 0.7;
    });
  });
  const tail = whiteNoise(length, seed + 9);
  shape(tail, decayEnvelope(length, 0.07, sampleRate, 0.02));
  for (let i = 0; i < length; i += 1) {
    out[i] = (out[i] ?? 0) + (tail[i] ?? 0) * 0.35;
  }
  filterInPlace(out, 'highpass', 500, sampleRate);
  filterInPlace(out, 'bandpass', 1500, sampleRate, { q: 0.7 });
  return out;
}

/**
 * Plucked synth: two detuned saws and a sub sine through a closing low-pass filter.
 * @param {VoiceContext & { hz: number, duration: number, brightness?: number }} v
 * @returns {Float32Array}
 */
export function pluck(v) {
  const { sampleRate, hz, duration, brightness = 1 } = v;
  const length = frames(duration, sampleRate);
  const a = saw(length, hz * 1.0035, sampleRate);
  const b = saw(length, hz * 0.9965, sampleRate, 0.37);
  const sub = sine(length, hz, sampleRate);
  const mix = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    mix[i] = ((a[i] ?? 0) + (b[i] ?? 0)) * 0.35 + (sub[i] ?? 0) * 0.3;
  }
  const filtered = sweepLowpass(
    mix,
    (i) => 380 + 4200 * brightness * Math.exp(-i / (0.16 * sampleRate)),
    1.1,
    sampleRate,
  );
  return shape(filtered, decayEnvelope(length, duration * 0.42, sampleRate, 0.003));
}

/**
 * FM bell: glassy and short, used for pings and the melody.
 * @param {VoiceContext & { hz: number, duration: number, shine?: number }} v
 * @returns {Float32Array}
 */
export function bell(v) {
  const { sampleRate, hz, duration, shine = 1 } = v;
  const length = frames(duration, sampleRate);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const index = 2.2 * shine * Math.exp(-t / 0.22);
    const modulator = Math.sin(TAU * hz * 3.5 * t);
    const carrier = Math.sin(TAU * hz * t + index * modulator);
    const overtone = 0.28 * Math.sin(TAU * hz * 2.76 * t) * Math.exp(-t / 0.18);
    out[i] = (carrier + overtone) * Math.exp(-t / (duration * 0.28));
  }
  const fade = Math.min(length, frames(0.004, sampleRate));
  for (let i = 0; i < fade; i += 1) {
    out[i] = (out[i] ?? 0) * (i / fade);
  }
  return out;
}

/**
 * Warm pad voice: three detuned saws plus a triangle, slowly opening.
 * @param {VoiceContext & { hz: number, duration: number, attack: number, release: number, brightness?: number }} v
 * @returns {Float32Array}
 */
export function padNote(v) {
  const { sampleRate, hz, duration, attack, release, brightness = 1 } = v;
  const length = frames(duration, sampleRate);
  const voices = [0.9946, 1, 1.0055].map((ratio, index) => saw(length, hz * ratio, sampleRate, index * 0.31));
  const low = triangle(length, hz / 2, sampleRate);
  const mix = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    mix[i] =
      ((voices[0]?.[i] ?? 0) + (voices[1]?.[i] ?? 0) + (voices[2]?.[i] ?? 0)) * 0.2 + (low[i] ?? 0) * 0.16;
  }
  const filtered = sweepLowpass(
    mix,
    (i) => (700 + 1500 * brightness) * (0.75 + 0.25 * Math.sin((TAU * 0.11 * i) / sampleRate + hz)),
    0.8,
    sampleRate,
  );
  return shape(filtered, swellEnvelope(length, attack, release, sampleRate));
}

/**
 * Round synth bass: a sine with a little second and third harmonic.
 * @param {VoiceContext & { hz: number, duration: number }} v
 * @returns {Float32Array}
 */
export function bass(v) {
  const { sampleRate, hz, duration } = v;
  const length = frames(duration, sampleRate);
  const out = new Float32Array(length);
  const fundamental = sine(length, hz, sampleRate);
  const second = sine(length, hz * 2, sampleRate);
  const third = sine(length, hz * 3, sampleRate);
  for (let i = 0; i < length; i += 1) {
    out[i] = Math.tanh(((fundamental[i] ?? 0) + (second[i] ?? 0) * 0.28 + (third[i] ?? 0) * 0.08) * 1.3) * 0.8;
  }
  const attack = frames(0.006, sampleRate);
  const release = frames(Math.min(0.09, duration * 0.4), sampleRate);
  for (let i = 0; i < length; i += 1) {
    const rise = Math.min(1, i / attack);
    const fall = Math.min(1, (length - 1 - i) / release);
    const body = 0.65 + 0.35 * Math.exp(-i / (0.18 * sampleRate));
    out[i] = (out[i] ?? 0) * rise * fall * body;
  }
  return out;
}

/**
 * Airy noise sweep, used for whooshes and risers.
 * @param {VoiceContext & { seed: number, duration: number, from: number, to: number, q?: number, curve?: number }} v
 *   `from` and `to` are the band centre in Hz at the start and end.
 * @returns {Float32Array}
 */
export function sweep(v) {
  const { sampleRate, seed, duration, from, to, q = 1.4, curve = 1 } = v;
  const length = frames(duration, sampleRate);
  const noise = whiteNoise(length, seed);
  const centre = (/** @type {number} */ i) => from * (to / from) ** ((i / length) ** curve);
  return sweepBandpass(noise, centre, q, sampleRate);
}
