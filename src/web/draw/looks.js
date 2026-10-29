/**
 * Procedural "looks": small rule-based generators in one accent and neutral grays.
 * Each look is a pure function of time, a seed and a beat pulse.
 */

import { PALETTE } from '../../config/video.config.js';
import { rgba } from '../../core/color.js';
import { TAU, clamp01, lerp } from '../../core/math.js';
import { fbm1, noise2 } from '../../core/noise.js';
import { hash2 } from '../../core/rng.js';
import { circle, disc, line, polyline, roundedRect } from './primitives.js';

export const LOOK_NAMES = Object.freeze(['contours', 'rings', 'bars', 'shards']);

/**
 * @typedef {object} LookOptions
 * @property {number} w Width of the drawing area in layout pixels.
 * @property {number} h Height of the drawing area.
 * @property {number} t Seconds on the master timeline.
 * @property {number} seed Every number below derives from this, so each seed looks different.
 * @property {number} pulse 0-1 beat envelope.
 * @property {number} [detail] Density multiplier. 1 is standard.
 * @property {string} [floor] Colour used to hide lines behind other lines.
 * @property {number} [alpha] Overall opacity.
 */

/**
 * Per-seed variation: how dense, how fast, how tilted.
 * @param {number} seed
 */
function variation(seed) {
  const pick = (/** @type {number} */ salt, /** @type {number} */ min, /** @type {number} */ max) =>
    lerp(min, max, hash2(salt, 3, seed));
  return {
    frequency: pick(1, 1.2, 6),
    speed: pick(2, 0.25, 0.7),
    tilt: pick(3, -0.45, 0.45),
    spread: pick(4, 0.12, 0.4),
    amplitude: pick(8, 0.7, 1.7),
    centre: pick(9, 0.28, 0.72),
    sides: 3 + Math.floor(pick(5, 0, 4)),
    accentAt: pick(6, 0.5, 0.74),
    turns: pick(7, 0.4, 1.4),
  };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {LookOptions} o
 */
function drawContours(ctx, o) {
  const v = variation(o.seed);
  const detail = o.detail ?? 1;
  const count = Math.round(30 * detail);
  const accentLine = Math.floor(count * v.accentAt);
  const top = o.h * 0.2;
  const span = o.h * 0.72;
  const step = Math.max(3, Math.round(5 / detail));
  for (let i = 0; i < count; i += 1) {
    const row = i / (count - 1);
    const base = top + span * row;
    /** @type {number[]} */
    const points = [];
    for (let x = 0; x <= o.w; x += step) {
      const u = x / o.w;
      const bell = Math.exp(-(((u - v.centre) / v.spread) ** 2) * 0.35);
      const n = noise2(u * v.frequency * 2.2 + o.t * v.speed, row * 3.1 + i * 0.02, o.seed);
      const height =
        o.h *
        0.2 *
        v.amplitude *
        bell *
        (0.35 + 0.65 * o.pulse + 0.25 * Math.sin(o.t * 0.9 + row * 5));
      points.push(x, base - Math.max(0, n * 0.6 + 0.4) * height + (u - 0.5) * v.tilt * o.h * 0.4);
    }
    const first = points[0] ?? 0;
    const last = points[points.length - 2] ?? o.w;
    ctx.beginPath();
    ctx.moveTo(first, o.h + 4);
    for (let k = 0; k < points.length; k += 2) {
      ctx.lineTo(points[k] ?? 0, points[k + 1] ?? 0);
    }
    ctx.lineTo(last, o.h + 4);
    ctx.closePath();
    ctx.fillStyle = o.floor ?? PALETTE.surface;
    ctx.fill();
    const isAccent = i === accentLine;
    polyline(
      ctx,
      points,
      isAccent ? PALETTE.accent : PALETTE.text,
      isAccent ? 1 : 0.18 + 0.5 * row,
      isAccent ? 1.6 : 1,
    );
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {LookOptions} o
 */
function drawRings(ctx, o) {
  const v = variation(o.seed);
  const detail = o.detail ?? 1;
  const count = Math.round(15 * detail);
  const cx = o.w / 2;
  const cy = o.h / 2;
  const gap = (Math.min(o.w, o.h) * 0.46) / count;
  const accentRing = Math.floor(count * v.accentAt);
  for (let i = 1; i <= count; i += 1) {
    const radius = i * gap * (1 + 0.05 * o.pulse * (1 - i / count));
    const direction = i % 2 === 0 ? 1 : -1;
    const start = o.t * v.speed * direction + i * 0.5 + hash2(i, 9, o.seed) * TAU;
    const sweep = TAU * (0.45 + 0.5 * hash2(i, 4, o.seed));
    const isAccent = i === accentRing;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, start + sweep);
    ctx.lineWidth = isAccent ? 1.8 : 1;
    ctx.strokeStyle = rgba(
      isAccent ? PALETTE.accent : PALETTE.text,
      isAccent ? 1 : 0.62 - (i / count) * 0.42,
    );
    ctx.stroke();
    if (isAccent) {
      const angle = start + sweep * (0.5 + 0.5 * Math.sin(o.t * 1.3));
      disc(ctx, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, 4, PALETTE.accent);
    }
  }
  disc(ctx, cx, cy, 2.5 + 2 * o.pulse, PALETTE.text, 0.9);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {LookOptions} o
 */
function drawBars(ctx, o) {
  const v = variation(o.seed);
  const detail = o.detail ?? 1;
  const count = Math.round(72 * detail);
  const mid = o.h * 0.52;
  const margin = o.w * 0.08;
  const spacing = (o.w - margin * 2) / (count - 1);
  const heights = Array.from({ length: count }, (_, i) => {
    const u = i / (count - 1);
    const shape = Math.sin(u * Math.PI) ** 1.4;
    const n = Math.abs(fbm1(u * v.frequency * 5 + o.t * v.speed * 2.4, o.seed, 3));
    return o.h * 0.4 * shape * (0.12 + 0.88 * n) * (0.55 + 0.75 * o.pulse);
  });
  const tallest = Math.max(...heights);
  heights.forEach((height, i) => {
    const x = margin + i * spacing;
    const isPeak = height > tallest * 0.9;
    const color = isPeak ? PALETTE.accent : PALETTE.text;
    ctx.lineCap = 'round';
    line(
      ctx,
      x,
      mid - height,
      x,
      mid + height * 0.55,
      color,
      isPeak ? 1 : 0.2 + 0.6 * (height / tallest),
      isPeak ? 2.4 : 1.6,
    );
  });
  line(ctx, margin, mid, o.w - margin, mid, PALETTE.lineStrong, 1, 1);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {LookOptions} o
 */
function drawShards(ctx, o) {
  const v = variation(o.seed);
  const detail = o.detail ?? 1;
  const count = Math.round(16 * detail);
  const cx = o.w / 2;
  const cy = o.h / 2;
  const gap = (Math.min(o.w, o.h) * 0.5) / count;
  const accentIndex = Math.floor(count * v.accentAt);
  for (let i = 1; i <= count; i += 1) {
    const radius = i * gap * (1 + 0.07 * o.pulse);
    const rotation = o.t * 0.22 * (i % 2 === 0 ? 1 : -1) * v.turns + i * 0.17;
    const isAccent = i === accentIndex;
    ctx.beginPath();
    for (let k = 0; k <= v.sides; k += 1) {
      const angle = rotation + (k / v.sides) * TAU;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = isAccent ? 1.8 : 1;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(
      isAccent ? PALETTE.accent : PALETTE.text,
      isAccent ? 1 : 0.6 - (i / count) * 0.45,
    );
    ctx.stroke();
  }
  circle(ctx, cx, cy, 3 + 3 * o.pulse, PALETTE.text, 0.8, 1);
}

const DRAWERS = Object.freeze({
  contours: drawContours,
  rings: drawRings,
  bars: drawBars,
  shards: drawShards,
});

/**
 * Draw a look into a rectangle, clipped to rounded corners.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} look One of LOOK_NAMES.
 * @param {LookOptions & { x?: number, y?: number, radius?: number }} options
 */
export function drawLook(ctx, look, options) {
  const draw = /** @type {Record<string, typeof drawContours>} */ (DRAWERS)[look];
  if (!draw) {
    throw new Error(`Unknown look "${look}".`);
  }
  const { x = 0, y = 0, radius = 0, alpha = 1 } = options;
  ctx.save();
  roundedRect(ctx, x, y, options.w, options.h, radius);
  ctx.clip();
  ctx.translate(x, y);
  ctx.globalAlpha = clamp01(alpha);
  draw(ctx, options);
  ctx.restore();
}
