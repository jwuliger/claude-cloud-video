/** Expanding rings that leave the brand mark on every kick. */

import { PALETTE } from '../../config/video.config.js';
import { clamp01 } from '../../core/math.js';
import { lastHitIndex } from '../../core/score.js';
import { EASE } from '../motion.js';
import { circle } from './primitives.js';

const RINGS_ALIVE = 3;

/**
 * @typedef {object} RingOptions
 * @property {number} x Centre.
 * @property {number} y
 * @property {number} startRadius
 * @property {number} endRadius
 * @property {number} life Seconds a ring takes to fade out.
 * @property {number} [strength] 0-1 overall opacity.
 * @property {number} [from] Ignore kicks before this time.
 * @property {number} [to] Ignore kicks after this time.
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t
 * @param {readonly number[]} kicks
 * @param {RingOptions} options
 */
export function drawRingPulses(ctx, t, kicks, options) {
  const {
    x,
    y,
    startRadius,
    endRadius,
    life,
    strength = 1,
    from = -Infinity,
    to = Infinity,
  } = options;
  const latest = lastHitIndex(kicks, t);
  for (let index = latest; index > latest - RINGS_ALIVE && index >= 0; index -= 1) {
    const hit = kicks[index] ?? 0;
    if (hit < from || hit >= to) {
      continue;
    }
    const progress = clamp01((t - hit) / life);
    if (progress >= 1) {
      continue;
    }
    const radius = startRadius + (endRadius - startRadius) * EASE.out(progress);
    circle(ctx, x, y, radius, PALETTE.accent, 0.55 * strength * (1 - progress) ** 1.5, 1);
  }
}
