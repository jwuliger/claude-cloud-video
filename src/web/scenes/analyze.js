/** 0:21 Analyze. Six signals are pulled out of the song, one per spoken word. */

import { COPY, PALETTE } from '../../config/video.config.js';
import { cue } from '../../core/cues.js';
import { mix } from '../../core/color.js';
import { clamp01 } from '../../core/math.js';
import { noise1 } from '../../core/noise.js';
import { createRng } from '../../core/rng.js';
import { maskedWord, place } from '../dom.js';
import { line, polyline, roundedRect } from '../draw/primitives.js';
import { EASE, leave, maskIn } from '../motion.js';

const LANE = { x: 400, w: 1400, h: 76, gap: 22, top: 168 };
const BEAT_PITCH = 70;
const SEED = 11;
const REVEAL_SECONDS = 0.9;
const HOT_SECONDS = 1.2;
/** Relative weight of each sixteenth step in the rhythm lane: kick, snare and hat feel. */
const STEP_WEIGHTS = [1, 0.25, 0.5, 0.25, 0.9, 0.25, 0.5, 0.25, 1, 0.25, 0.5, 0.25, 0.9, 0.25, 0.5, 0.45];

/** @param {number} index @returns {number} Top edge of a lane. */
const laneTop = (index) => LANE.top + index * (LANE.h + LANE.gap);

/**
 * Static shapes for the vocal phrases and instrument blocks, built once from a fixed seed.
 */
function buildShapes() {
  const rng = createRng(SEED);
  const phrases = [
    [0.03, 0.21],
    [0.27, 0.47],
    [0.53, 0.75],
    [0.81, 0.97],
  ].map(([from = 0, to = 0]) => {
    const notes = [];
    for (let x = from * LANE.w; x <= to * LANE.w; x += 30) {
      notes.push({ x, level: Math.round(rng() * 5) / 5 });
    }
    return notes;
  });
  const blocks = [0, 1, 2].flatMap((row) => {
    const rowBlocks = [];
    let x = rng() * 80;
    while (x < LANE.w - 60) {
      const width = 120 + rng() * 220;
      rowBlocks.push({ x, width: Math.min(width, LANE.w - x), row });
      x += width + 12 + rng() * 26;
    }
    return rowBlocks;
  });
  return { phrases, blocks };
}

const SHAPES = buildShapes();

/**
 * @typedef {object} LaneState
 * @property {number} reveal 0-1 left-to-right reveal.
 * @property {number} hot 0-1 accent highlight.
 */

/**
 * @param {import('../film.js').SceneContext} ctx
 */
export function buildAnalyze(ctx) {
  const { tl, scene, root, cues, layers } = ctx;
  const lanes = COPY.analyze.lanes;
  /** @type {LaneState[]} */
  const states = lanes.map(() => ({ reveal: 0, hot: 0 }));
  const frame = { lines: 0, play: 0 };

  tl.fromTo(frame, { lines: 0 }, { lines: 1, duration: 0.9, ease: EASE.out }, scene.start + 0.15);
  const firstAt = cue(cues, `lane.${lanes[0]?.id ?? 'beat'}`);
  tl.fromTo(frame, { play: 0 }, { play: 1, duration: scene.end - 0.7 - firstAt, ease: EASE.linear }, firstAt);

  lanes.forEach((lane, index) => {
    const at = cue(cues, `lane.${lane.id}`);
    const state = states[index];
    if (!state) {
      return;
    }
    const { outer, inner } = maskedWord(root, lane.label, 'body strong nowrap');
    place(outer, { x: 120, y: laneTop(index) + LANE.h / 2 - 17 });
    maskIn(tl, inner, at);
    tl.fromTo(state, { reveal: 0 }, { reveal: 1, duration: REVEAL_SECONDS, ease: EASE.out }, at);
    tl.fromTo(state, { hot: 0 }, { hot: 1, duration: 0.25, ease: EASE.out }, at);
    tl.to(state, { hot: 0, duration: 0.6, ease: EASE.inOut }, at + HOT_SECONDS);
    leave(tl, outer, scene.end - 0.4);
  });

  const layer = layers.add({
    parent: root,
    width: 1920,
    height: 1080,
    start: scene.start,
    end: scene.end,
    draw: (c, t) => drawLanes(c, t, states, frame),
  });
  leave(tl, layer, scene.end - 0.4, { y: 0 });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t
 * @param {readonly LaneState[]} states
 * @param {{ lines: number, play: number }} frame
 */
function drawLanes(ctx, t, states, frame) {
  states.forEach((state, index) => {
    const top = laneTop(index);
    const progress = EASE.out(clamp01(frame.lines * 1.5 - index * 0.1));
    line(ctx, LANE.x, top, LANE.x + LANE.w * progress, top, PALETTE.line, 1);
    line(ctx, LANE.x, top + LANE.h, LANE.x + LANE.w * progress, top + LANE.h, PALETTE.line, 1);
    if (state.reveal <= 0) {
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(LANE.x, top - 6, LANE.w * state.reveal, LANE.h + 12);
    ctx.clip();
    ctx.translate(LANE.x, top);
    const ink = mix(PALETTE.textMid, PALETTE.accent, state.hot);
    DRAWERS[index]?.(ctx, t, ink);
    ctx.restore();
  });
  if (frame.play > 0 && frame.play < 1) {
    const x = LANE.x + LANE.w * frame.play;
    const bottom = laneTop(states.length - 1) + LANE.h;
    line(ctx, x, LANE.top - 14, x, bottom + 14, PALETTE.text, 0.55, 1);
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} color
 * @param {number} width
 */
function stroke(ctx, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
}

/** Beat: a tick on every beat, taller on the downbeat. */
function drawBeat(/** @type {CanvasRenderingContext2D} */ ctx, /** @type {number} */ t, /** @type {string} */ ink) {
  for (let i = 0; i * BEAT_PITCH <= LANE.w; i += 1) {
    const strong = i % 4 === 0;
    const height = strong ? LANE.h * 0.72 : LANE.h * 0.42;
    ctx.beginPath();
    ctx.moveTo(i * BEAT_PITCH + 0.5, LANE.h / 2 - height / 2);
    ctx.lineTo(i * BEAT_PITCH + 0.5, LANE.h / 2 + height / 2);
    stroke(ctx, ink, strong ? 3 : 2);
    ctx.globalAlpha = strong ? 1 : 0.7;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  void t;
}

/** Rhythm: one dot per sixteenth note, sized by how hard that step hits. */
function drawRhythm(/** @type {CanvasRenderingContext2D} */ ctx, /** @type {number} */ t, /** @type {string} */ ink) {
  const pitch = BEAT_PITCH / 4;
  ctx.fillStyle = ink;
  for (let i = 0; i * pitch < LANE.w; i += 1) {
    const weight = STEP_WEIGHTS[i % STEP_WEIGHTS.length] ?? 0.3;
    ctx.beginPath();
    ctx.arc(i * pitch + pitch / 2, LANE.h / 2, 1.8 + weight * 5.2, 0, Math.PI * 2);
    ctx.globalAlpha = 0.45 + weight * 0.55;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  void t;
}

/** Lows: a slow swell that surges on every beat. */
function drawLows(/** @type {CanvasRenderingContext2D} */ ctx, /** @type {number} */ t, /** @type {string} */ ink) {
  /** @type {number[]} */
  const points = [];
  for (let x = 0; x <= LANE.w; x += 5) {
    const beat = Math.exp(-((((x % BEAT_PITCH) - 8) / 22) ** 2));
    const swell = 0.5 + 0.5 * noise1(x / 260 + t * 0.4, SEED);
    points.push(x, LANE.h - 6 - (LANE.h - 14) * (0.12 + 0.88 * beat * (0.55 + 0.45 * swell)));
  }
  ctx.beginPath();
  ctx.moveTo(0, LANE.h - 6);
  for (let k = 0; k < points.length; k += 2) {
    ctx.lineTo(points[k] ?? 0, points[k + 1] ?? 0);
  }
  ctx.lineTo(LANE.w, LANE.h - 6);
  ctx.closePath();
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.16;
  ctx.fill();
  ctx.globalAlpha = 1;
  polyline(ctx, points, PALETTE.text, 0, 0);
  ctx.beginPath();
  for (let k = 0; k < points.length; k += 2) {
    if (k === 0) ctx.moveTo(points[k] ?? 0, points[k + 1] ?? 0);
    else ctx.lineTo(points[k] ?? 0, points[k + 1] ?? 0);
  }
  stroke(ctx, ink, 2);
  ctx.stroke();
}

/** Mids: dense vertical strokes that shimmer. */
function drawMids(/** @type {CanvasRenderingContext2D} */ ctx, /** @type {number} */ t, /** @type {string} */ ink) {
  for (let i = 0; i * 9 < LANE.w; i += 1) {
    const level = 0.18 + 0.82 * Math.abs(noise1(i * 0.37 + t * 1.2, SEED + 3));
    const half = (LANE.h / 2 - 8) * level;
    ctx.beginPath();
    ctx.moveTo(i * 9 + 0.5, LANE.h / 2 - half);
    ctx.lineTo(i * 9 + 0.5, LANE.h / 2 + half);
    stroke(ctx, ink, 2);
    ctx.stroke();
  }
}

/** Vocals: a melody contour in phrases, with a dot on every note. */
function drawVocals(/** @type {CanvasRenderingContext2D} */ ctx, /** @type {number} */ t, /** @type {string} */ ink) {
  for (const phrase of SHAPES.phrases) {
    const points = phrase.flatMap((note) => [note.x, LANE.h - 12 - note.level * (LANE.h - 24)]);
    polyline(ctx, points, ink, 1, 2);
    ctx.fillStyle = ink;
    phrase.forEach((note) => {
      ctx.beginPath();
      ctx.arc(note.x, LANE.h - 12 - note.level * (LANE.h - 24), 3.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  void t;
}

/** Instrumentals: sustained blocks in three rows. */
function drawInstrumentals(/** @type {CanvasRenderingContext2D} */ ctx, /** @type {number} */ t, /** @type {string} */ ink) {
  ctx.fillStyle = ink;
  for (const block of SHAPES.blocks) {
    roundedRect(ctx, block.x, 10 + block.row * 21, block.width, 12, 6);
    ctx.globalAlpha = 0.35 + 0.4 * ((block.x / 97) % 1);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  void t;
}

const DRAWERS = [drawBeat, drawRhythm, drawLows, drawMids, drawVocals, drawInstrumentals];
