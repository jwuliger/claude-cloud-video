/** Filters: RBJ biquads for static EQ and a state-variable filter for sweeping cutoffs. */

/**
 * @typedef {'lowpass' | 'highpass' | 'bandpass' | 'peaking' | 'lowshelf' | 'highshelf' | 'notch'} BiquadType
 * @typedef {{ b0: number, b1: number, b2: number, a1: number, a2: number }} BiquadCoefficients
 */

/**
 * RBJ audio EQ cookbook coefficients.
 * @param {BiquadType} type
 * @param {number} hz Centre or corner frequency.
 * @param {number} q Quality factor.
 * @param {number} gainDb Used by peaking and shelving types.
 * @param {number} sampleRate
 * @returns {BiquadCoefficients}
 */
export function biquad(type, hz, q, gainDb, sampleRate) {
  const w0 = (2 * Math.PI * hz) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const a = 10 ** (gainDb / 40);
  /** @type {number[]} */
  let c;
  switch (type) {
    case 'lowpass':
      c = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2, 1 + alpha, -2 * cos, 1 - alpha];
      break;
    case 'highpass':
      c = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2, 1 + alpha, -2 * cos, 1 - alpha];
      break;
    case 'bandpass':
      c = [alpha, 0, -alpha, 1 + alpha, -2 * cos, 1 - alpha];
      break;
    case 'notch':
      c = [1, -2 * cos, 1, 1 + alpha, -2 * cos, 1 - alpha];
      break;
    case 'peaking':
      c = [1 + alpha * a, -2 * cos, 1 - alpha * a, 1 + alpha / a, -2 * cos, 1 - alpha / a];
      break;
    case 'lowshelf': {
      const s = 2 * Math.sqrt(a) * alpha;
      c = [
        a * (a + 1 - (a - 1) * cos + s),
        2 * a * (a - 1 - (a + 1) * cos),
        a * (a + 1 - (a - 1) * cos - s),
        a + 1 + (a - 1) * cos + s,
        -2 * (a - 1 + (a + 1) * cos),
        a + 1 + (a - 1) * cos - s,
      ];
      break;
    }
    case 'highshelf': {
      const s = 2 * Math.sqrt(a) * alpha;
      c = [
        a * (a + 1 + (a - 1) * cos + s),
        -2 * a * (a - 1 + (a + 1) * cos),
        a * (a + 1 + (a - 1) * cos - s),
        a + 1 - (a - 1) * cos + s,
        2 * (a - 1 - (a + 1) * cos),
        a + 1 - (a - 1) * cos - s,
      ];
      break;
    }
    default:
      throw new Error(`Unknown biquad type "${String(type)}".`);
  }
  const [b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0] = c;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/**
 * Filter a buffer in place.
 * @param {Float32Array} buffer
 * @param {BiquadCoefficients} c
 * @returns {Float32Array} The same buffer.
 */
export function applyBiquad(buffer, c) {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const x0 = buffer[i] ?? 0;
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    buffer[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return buffer;
}

/**
 * Convenience: build and apply one biquad.
 * @param {Float32Array} buffer
 * @param {BiquadType} type
 * @param {number} hz
 * @param {number} sampleRate
 * @param {{ q?: number, gainDb?: number }} [options]
 * @returns {Float32Array}
 */
export function filterInPlace(buffer, type, hz, sampleRate, options = {}) {
  const { q = 0.7071, gainDb = 0 } = options;
  return applyBiquad(buffer, biquad(type, hz, q, gainDb, sampleRate));
}

/**
 * State-variable lowpass whose cutoff may change every sample.
 * @param {Float32Array} input
 * @param {(index: number) => number} cutoffAt Cutoff in Hz for each sample.
 * @param {number} q Resonance (0.5 is gentle, 4 is ringing).
 * @param {number} sampleRate
 * @returns {Float32Array} New buffer.
 */
export function sweepLowpass(input, cutoffAt, q, sampleRate) {
  const out = new Float32Array(input.length);
  const k = 1 / q;
  let ic1 = 0;
  let ic2 = 0;
  for (let i = 0; i < input.length; i += 1) {
    const g = Math.tan((Math.PI * Math.min(cutoffAt(i), sampleRate * 0.45)) / sampleRate);
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = (input[i] ?? 0) - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    out[i] = v2;
  }
  return out;
}

/**
 * State-variable bandpass with a sweeping centre frequency, for airy whooshes.
 * @param {Float32Array} input
 * @param {(index: number) => number} centreAt
 * @param {number} q
 * @param {number} sampleRate
 * @returns {Float32Array}
 */
export function sweepBandpass(input, centreAt, q, sampleRate) {
  const out = new Float32Array(input.length);
  const k = 1 / q;
  let ic1 = 0;
  let ic2 = 0;
  for (let i = 0; i < input.length; i += 1) {
    const g = Math.tan((Math.PI * Math.min(centreAt(i), sampleRate * 0.45)) / sampleRate);
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = (input[i] ?? 0) - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    out[i] = v1 * k;
  }
  return out;
}
