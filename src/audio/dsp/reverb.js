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
 */

/**
 * Read a delay line at a fractional position, interpolating between neighbours.
 * @param {Float32Array} buffer Circular buffer.
 * @param {number} position Absolute (unwrapped) read position.
 * @returns {number}
 */
function readFractional(buffer, position) {
  const span = buffer.length;
  const base = Math.floor(position);
  const fraction = position - base;
  const a = buffer[((base % span) + span) % span] ?? 0;
  const b = buffer[(((base + 1) % span) + span) % span] ?? 0;
  return a + (b - a) * fraction;
}

/**
 * The delay lines and their per-line feedback gain for a target decay time.
 * @param {number} sampleRate
 * @param {number} rt60
 * @param {number} size
 */
function createNetwork(sampleRate, rt60, size) {
  const scale = (sampleRate / 48000) * size;
  const lengths = BASE_LENGTHS.map((length) => Math.round(length * scale));
  return {
    lengths,
    buffers: lengths.map((length) => new Float32Array(length + MARGIN * 2)),
    feedback: lengths.map((length) => 10 ** ((-3 * length) / (rt60 * sampleRate))),
  };
}

/**
 * One delay line's output at sample `i`, with a slow wobble that stops metallic ringing.
 * @param {ReturnType<typeof createNetwork>} network
 * @param {number} line
 * @param {number} i
 * @param {number} sampleRate
 * @returns {number}
 */
function readLine(network, line, i, sampleRate) {
  const wobble = 1.6 * Math.sin((2 * Math.PI * MOD_RATES_HZ[line] * i) / sampleRate + line);
  return readFractional(network.buffers[line], i - (network.lengths[line] + MARGIN + wobble));
}

/**
 * Sum the line outputs into a left and right sample with different sign patterns.
 * @param {Float64Array} outputs
 * @returns {[number, number]}
 */
function mixToStereo(outputs) {
  let left = 0;
  let right = 0;
  for (let line = 0; line < LINES; line += 1) {
    left += outputs[line] * LEFT_SIGNS[line];
    right += outputs[line] * RIGHT_SIGNS[line];
  }
  return [left * OUTPUT_GAIN, right * OUTPUT_GAIN];
}

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
  const network = createNetwork(sampleRate, rt60, size);
  const lowpass = new Float64Array(LINES);
  const outputs = new Float64Array(LINES);
  const preFrames = Math.round(preDelay * sampleRate);

  const mono = new Float32Array(frames);
  for (let i = preFrames; i < frames; i += 1) {
    mono[i] = ((input.l[i - preFrames] ?? 0) + (input.r[i - preFrames] ?? 0)) * 0.5;
  }
  const diffused = diffuse(mono);

  for (let i = 0; i < frames; i += 1) {
    for (let line = 0; line < LINES; line += 1) {
      lowpass[line] =
        (1 - damping) * readLine(network, line, i, sampleRate) + damping * lowpass[line];
      outputs[line] = lowpass[line] * network.feedback[line];
    }
    [wet.l[i], wet.r[i]] = mixToStereo(outputs);
    hadamard8(outputs);
    for (let line = 0; line < LINES; line += 1) {
      const buffer = network.buffers[line];
      buffer[i % buffer.length] = outputs[line] + diffused[i] * 0.35;
    }
  }
  return wet;
}
