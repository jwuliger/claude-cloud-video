/** The hero line: a hairline that becomes a waveform and kicks with the beat. */

import { PALETTE, VIDEO } from '../../config/video.config.js';
import { smoothstep } from '../../core/math.js';
import { noise1 } from '../../core/noise.js';
import { pulse } from '../../core/score.js';
import { line, polyline } from './primitives.js';

const STEP = 3;
const PULSE_TIME_CONSTANT = 0.22;
/** Echo trails: how far behind the main line they run, and how visible they are. */
const ECHOES = [
  { lag: 0.1, alpha: 0.14, width: 1 },
  { lag: 0.05, alpha: 0.3, width: 1 },
  { lag: 0, alpha: 1, width: 2 },
];

/**
 * @typedef {object} PulseLineState
 * @property {number} y Baseline position.
 * @property {number} grow 0-1: how far the hairline has extended from the centre.
 * @property {number} ignite 0-1: how much of the waveform is switched on.
 * @property {number} amplitude Peak height at a full kick.
 */

/**
 * @param {number} u 0-1 across the width.
 * @returns {number} Amplitude envelope: calm edges, strongest near the centre.
 */
function envelope(u) {
  const edges = smoothstep(0, 0.14, u) * smoothstep(1, 0.86, u);
  const centre = Math.exp(-(((u - 0.5) / 0.3) ** 2));
  return edges * (0.3 + 0.7 * centre);
}

/**
 * @param {number} u
 * @param {number} t
 * @param {number} seed
 * @returns {number} Signal sample in about [-1, 1].
 */
function signal(u, t, seed) {
  return (
    0.55 * Math.sin(u * 34 + t * 2.4) +
    0.3 * Math.sin(u * 79 - t * 4.1 + 1.3) +
    0.45 * noise1(u * 26 + t * 1.7, seed)
  );
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t Seconds on the master timeline.
 * @param {PulseLineState} state
 * @param {readonly number[]} kicks Kick onset times.
 */
export function drawPulseLine(ctx, t, state, kicks) {
  const width = VIDEO.layoutWidth;
  const half = (width / 2) * state.grow;
  const x0 = width / 2 - half;
  const x1 = width / 2 + half;
  line(ctx, x0, state.y, x1, state.y, PALETTE.lineStrong, 1, 1);
  if (state.ignite <= 0.001) {
    return;
  }
  for (const echo of ECHOES) {
    const time = t - echo.lag;
    const level = state.ignite * (0.12 + 0.88 * pulse(kicks, time, PULSE_TIME_CONSTANT));
    /** @type {number[]} */
    const points = [];
    for (let x = x0; x <= x1; x += STEP) {
      const u = x / width;
      const offset = signal(u, time, VIDEO.seed) * state.amplitude * level * envelope(u);
      points.push(x, state.y - offset);
    }
    polyline(ctx, points, PALETTE.accent, echo.alpha, echo.width);
  }
}
