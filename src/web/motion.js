/** Shared GSAP motion vocabulary: brand easings and the few entrance/exit patterns the scenes use. */

import { cubicBezier } from '../core/easing.js';
import { MOTION } from '../config/video.config.js';

const [outX1, outY1, outX2, outY2] = MOTION.ease.out;
const [inOutX1, inOutY1, inOutX2, inOutY2] = MOTION.ease.inOut;
const [inX1, inY1, inX2, inY2] = MOTION.ease.in;

export const EASE = Object.freeze({
  out: cubicBezier(outX1, outY1, outX2, outY2),
  inOut: cubicBezier(inOutX1, inOutY1, inOutX2, inOutY2),
  in: cubicBezier(inX1, inY1, inX2, inY2),
  linear: 'none',
});

export const DURATION = MOTION.duration;
export const SCENE_LEAD = MOTION.sceneLead;

/**
 * When a scene's content should start leaving so it is gone at the cut.
 * @param {{ end: number }} scene
 * @returns {number} Seconds.
 */
export function exitTime(scene) {
  return scene.end - MOTION.exit;
}

/** @typedef {gsap.core.Timeline} Timeline */
/** @typedef {gsap.TweenTarget} Targets */

/**
 * Fade and rise into place. The first tween on an element, so it sets the hidden start state.
 * @param {Timeline} tl
 * @param {Targets} targets
 * @param {number} at Absolute time in seconds.
 * @param {{ y?: number, x?: number, duration?: number, stagger?: number, ease?: gsap.EaseString | gsap.EaseFunction }} [options]
 */
export function riseIn(tl, targets, at, options = {}) {
  const { y = 28, x = 0, duration = DURATION.base, stagger = 0, ease = EASE.out } = options;
  tl.fromTo(targets, { opacity: 0, y, x }, { opacity: 1, y: 0, x: 0, duration, stagger, ease }, at);
}

/**
 * Slide words up out of their masks. Expects `.mask > .inner` markup.
 * @param {Timeline} tl
 * @param {Targets} inners
 * @param {number} at
 * @param {{ duration?: number, stagger?: number }} [options]
 */
export function maskIn(tl, inners, at, options = {}) {
  const { duration = DURATION.base, stagger = 0 } = options;
  tl.fromTo(inners, { yPercent: 115 }, { yPercent: 0, duration, stagger, ease: EASE.out }, at);
}

/**
 * Fade out and drift up. Always a `to` tween, so it never fights the entrance.
 * @param {Timeline} tl
 * @param {Targets} targets
 * @param {number} at
 * @param {{ y?: number, duration?: number, stagger?: number }} [options]
 */
export function leave(tl, targets, at, options = {}) {
  const { y = -18, duration = MOTION.exit, stagger = 0 } = options;
  tl.to(targets, { opacity: 0, y, duration, stagger, ease: EASE.in }, at);
}
