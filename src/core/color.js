/** Colour helpers for turning the config palette into canvas and CSS strings. */

import { clamp01, lerp } from './math.js';

/**
 * @param {string} hex `#rrggbb`
 * @returns {[number, number, number]} 0-255 channels.
 */
export function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * @param {string} hex `#rrggbb`
 * @param {number} alpha 0-1
 * @returns {string} CSS `rgb(r g b / a)` string.
 */
export function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${r} ${g} ${b} / ${clamp01(alpha).toFixed(3)})`;
}

/**
 * Linear blend of two hex colours.
 * @param {string} from `#rrggbb`
 * @param {string} to `#rrggbb`
 * @param {number} t 0-1
 * @returns {string} CSS `rgb(...)` string.
 */
export function mix(from, to, t) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const [r, g, bl] = a.map((channel, i) => Math.round(lerp(channel, b[i] ?? channel, clamp01(t))));
  return `rgb(${r} ${g} ${bl})`;
}
