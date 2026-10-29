/** Seeded randomness. The film never calls Math.random, so every frame is reproducible. */

import { fract } from './math.js';

/**
 * Small, fast 32-bit generator (mulberry32).
 * @param {number} seed
 * @returns {() => number} Function returning floats in [0, 1).
 */
export function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stable 32-bit hash of a string, handy for turning a label into a seed.
 * @param {string} text
 * @returns {number}
 */
export function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Pick a float in [min, max) from a generator.
 * @param {() => number} rng
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function range(rng, min, max) {
  return min + (max - min) * rng();
}

/**
 * Deterministic value in [0, 1) from an integer pair and a seed, without keeping state.
 * @param {number} x
 * @param {number} y
 * @param {number} seed
 * @returns {number}
 */
export function hash2(x, y, seed) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123);
}
