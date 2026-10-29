/** Smooth value noise built on the seeded hash, for organic but reproducible motion. */

import { lerp } from './math.js';
import { hash2 } from './rng.js';

/**
 * @param {number} t
 * @returns {number} Quintic fade curve, so noise has continuous second derivatives.
 */
function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Smooth 1D noise in [-1, 1].
 * @param {number} x
 * @param {number} [seed]
 * @returns {number}
 */
export function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash2(i, 0, seed) * 2 - 1;
  const b = hash2(i + 1, 0, seed) * 2 - 1;
  return lerp(a, b, fade(f));
}

/**
 * Smooth 2D noise in [-1, 1].
 * @param {number} x
 * @param {number} y
 * @param {number} [seed]
 * @returns {number}
 */
export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const corner = (/** @type {number} */ dx, /** @type {number} */ dy) =>
    hash2(ix + dx, iy + dy, seed) * 2 - 1;
  return lerp(lerp(corner(0, 0), corner(1, 0), fx), lerp(corner(0, 1), corner(1, 1), fx), fy);
}

/**
 * Fractal sum of 1D noise octaves, normalised to roughly [-1, 1].
 * @param {number} x
 * @param {number} seed
 * @param {number} [octaves]
 * @returns {number}
 */
export function fbm1(x, seed, octaves = 3) {
  let total = 0;
  let amplitude = 1;
  let norm = 0;
  let frequency = 1;
  for (let o = 0; o < octaves; o += 1) {
    total += noise1(x * frequency, seed + o * 17) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total / norm;
}
