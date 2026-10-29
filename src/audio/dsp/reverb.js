/** Stereo feedback-delay-network reverb: eight modulated delay lines with a Hadamard mix. */

import { createStereo } from './buffer.js';

const LINES = 8;
const BASE_LENGTHS = [1031, 1327, 1523, 1789, 2087, 2411, 2693, 2999];
const MOD_RATES_HZ = [0.13, 0.17, 0.21, 0.23, 0.27, 0.31, 0.37, 0.41];
const LEFT_SIGNS = [1, -1, 1, -1, 1, -1, 1, -1];
const RIGHT_SIGNS = [1, 1, -1, -1, 1, 1, -1, -1];
const OUTPUT_GAIN = 0.32;
const ALLPASS_DELAYS = [142, 107, 379, 277];
const ALLPASS_GAIN = 0.6;
const MARGIN = 24;

/**
 * Fast Walsh-Hadamard transform of 8 values in place, scaled to preserve energy.
 * @param {Float64Array} values
 */
function hadamard8(values) {
  for (let span = 1; span < LINES; span *= 2) {
    for (let start = 0; start < LINES; start += span * 2) {
      for (let i = start; i < start + span; i += 1) {
        const a = values[i] ?? 0;
        const b = values[i + span] ?? 0;
        values[i] = a + b;
        values[i + span] = a - b;
      }
    }
  }
  const scale = 1 / Math.sqrt(LINES);
  for (let i = 0; i < LINES; i += 1) {
    values[i] = (values[i] ?? 0) * scale;
  }
}

/**
 * Series allpass filters that smear the input so echoes start dense.
 * @param {Float32Array} signal
 * @returns {Float32Array}
 */
function diffuse(signal) {
  let current = Float32Array.from(signal);
  for (const delay of ALLPASS_DELAYS) {
    const memory = new Float32Array(delay);
    const next = new Float32Array(current.length);
    let index = 0;
    for (let i = 0; i < current.length; i += 1) {
      const delayed = memory[index] ?? 0;
      const x = current[i] ?? 0;
      const y = delayed - ALLPASS_GAIN * x;
      memory[index] = x + ALLPASS_GAIN * y;
      next[i] = y;
      index = (index + 1) % delay;
    }
    current = next;
  }
  return current;
}

/**
 * @typedef {object} ReverbOptions
 * @property {number} sampleRate
 * @property {number} [rt60] Seconds for the tail to fall 60 dB.
 * @property {number} [damping] 0-1: how fast high frequencies die in the tail.
 * @property {number} [preDelay] Seconds.
 * @property {number} [size] Scales the delay lengths.
 * @property {number} [tail] Extra seconds of silence appended so the tail can ring out.
 */

/**
 * Process a send bus and return only the wet signal.
 * @param {import('./buffer.js').Stereo} input
 * @param {ReverbOptions} options
 * @returns {import('./buffer.js').Stereo}
 */
export function reverb(input, options) {
  const { sampleRate, rt60 = 2.6, damping = 0.35, preDelay = 0.02, size = 1 } = options;
  const frames = input.l.length;
  const wet = createStereo(frames);
  const scale = (sampleRate / 48000) * size;
  const lengths = BASE_LENGTHS.map((length) => Math.round(length * scale));
  const buffers = lengths.map((length) => new Float32Array(length + MARGIN * 2));
  const feedback = lengths.map((length) => 10 ** ((-3 * length) / (rt60 * sampleRate)));
  const lowpass = new Float64Array(LINES);
  const outputs = new Float64Array(LINES);
  const preFrames = Math.round(preDelay * sampleRate);

  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) {
    const source = i - preFrames;
    mono[i] = source >= 0 ? ((input.l[source] ?? 0) + (input.r[source] ?? 0)) * 0.5 : 0;
  }
  const diffused = diffuse(mono);

  for (let i = 0; i < frames; i += 1) {
    for (let line = 0; line < LINES; line += 1) {
      const buffer = buffers[line] ?? new Float32Array(1);
      const length = lengths[line] ?? 1;
      const modulation = 1.6 * Math.sin((2 * Math.PI * (MOD_RATES_HZ[line] ?? 0.2) * i) / sampleRate + line);
      const readAt = i - (length + MARGIN + modulation);
      const base = Math.floor(readAt);
      const fraction = readAt - base;
      const span = buffer.length;
      const a = buffer[((base % span) + span) % span] ?? 0;
      const b = buffer[(((base + 1) % span) + span) % span] ?? 0;
      const delayed = a + (b - a) * fraction;
      lowpass[line] = (1 - damping) * delayed + damping * (lowpass[line] ?? 0);
      outputs[line] = (lowpass[line] ?? 0) * (feedback[line] ?? 0.9);
    }
    let left = 0;
    let right = 0;
    for (let line = 0; line < LINES; line += 1) {
      left += (outputs[line] ?? 0) * (LEFT_SIGNS[line] ?? 1);
      right += (outputs[line] ?? 0) * (RIGHT_SIGNS[line] ?? 1);
    }
    wet.l[i] = left * OUTPUT_GAIN;
    wet.r[i] = right * OUTPUT_GAIN;
    hadamard8(outputs);
    const x = diffused[i] ?? 0;
    for (let line = 0; line < LINES; line += 1) {
      const buffer = buffers[line] ?? new Float32Array(1);
      buffer[i % buffer.length] = (outputs[line] ?? 0) + x * 0.35;
    }
  }
  return wet;
}
