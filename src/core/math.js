/** Small numeric helpers shared by the timeline, the canvas drawing and the audio code. */

export const TAU = Math.PI * 2;

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * @param {number} value
 * @returns {number}
 */
export function clamp01(value) {
  return clamp(value, 0, 1);
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Position of `value` between `a` and `b`, unclamped.
 * @param {number} a
 * @param {number} b
 * @param {number} value
 * @returns {number}
 */
export function invLerp(a, b, value) {
  return a === b ? 0 : (value - a) / (b - a);
}

/**
 * Map `value` from one range to another, clamped to the output range.
 * @param {number} value
 * @param {number} inMin
 * @param {number} inMax
 * @param {number} outMin
 * @param {number} outMax
 * @returns {number}
 */
export function remap(value, inMin, inMax, outMin, outMax) {
  return lerp(outMin, outMax, clamp01(invLerp(inMin, inMax, value)));
}

/**
 * Hermite smooth step between two edges.
 * @param {number} edge0
 * @param {number} edge1
 * @param {number} value
 * @returns {number}
 */
export function smoothstep(edge0, edge1, value) {
  const t = clamp01(invLerp(edge0, edge1, value));
  return t * t * (3 - 2 * t);
}

/**
 * Positive modulo, so negative inputs wrap instead of going negative.
 * @param {number} value
 * @param {number} modulus
 * @returns {number}
 */
export function mod(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

/**
 * Exponential decay that starts at 1 and falls with the given time constant (seconds).
 * Used for "pulse on the beat" envelopes.
 * @param {number} elapsed Seconds since the trigger. Negative values return 0.
 * @param {number} timeConstant
 * @returns {number}
 */
export function decay(elapsed, timeConstant) {
  return elapsed < 0 ? 0 : Math.exp(-elapsed / timeConstant);
}

/**
 * @param {number} value
 * @returns {number} `value` minus its floor, always in [0, 1).
 */
export function fract(value) {
  return value - Math.floor(value);
}

/**
 * Round to a fixed number of decimals, for stable comparisons and display.
 * @param {number} value
 * @param {number} [digits]
 * @returns {number}
 */
export function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
