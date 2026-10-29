/** 0:03 Problem. Video cuts drift away from the beat grid. */

import { COPY, PALETTE } from '../../config/video.config.js';
import { cue } from '../../core/cues.js';
import { clamp01 } from '../../core/math.js';
import { place, el, maskedWord } from '../dom.js';
import { line as strokeLine, roundedRect } from '../draw/primitives.js';
import { DURATION, EASE, SCENE_LEAD, leave, maskIn, riseIn } from '../motion.js';
import { rgba } from '../../core/color.js';

const PANEL = { x: 120, y: 450, w: 1682, h: 380 };
const BEAT_WIDTH = 112;
const LINE_COUNT = 16;
const TICK_Y = 64;
const CUT_Y = 190;
const CUT_HEIGHT = 104;
const CUT_RADIUS = 12;
/** Clips as [start beat, length in beats, drift in pixels once the sync is lost]. */
const CLIPS = [
  [0.5, 2, -14],
  [3.5, 2.5, 30],
  [6.8, 1.5, -44],
  [9, 3, 56],
  [12.8, 2.2, -34],
];

/**
 * @param {import('../film.js').SceneContext} ctx
 */
export function buildProblem(ctx) {
  const { tl, scene, root, cues, layers } = ctx;
  const collapseAt = cue(cues, 'problem.collapse');
  const state = { grid: 0, clips: 0, drift: 0, collapse: 0 };

  COPY.problem.lines.forEach((text, index) => {
    const { outer, inner } = maskedWord(root, text, 'headline nowrap');
    place(outer, { x: 120, y: 150 + index * 104 });
    maskIn(tl, inner, cue(cues, index === 0 ? 'problem.slow' : 'problem.rarely'));
    leave(tl, outer, collapseAt - 0.2);
  });

  const labels = [
    [COPY.problem.beatLabel, PANEL.y + TICK_Y - 34],
    [COPY.problem.cutsLabel, PANEL.y + CUT_Y - 34],
  ];
  const labelNodes = labels.map(([text, y]) => {
    const node = el('div', 'label', root, String(text));
    return place(node, { x: PANEL.x, y: Number(y) });
  });
  riseIn(tl, labelNodes, scene.start + 0.25, { y: 10, stagger: 0.12, duration: DURATION.short });
  leave(tl, labelNodes, collapseAt - 0.2);

  tl.fromTo(
    state,
    { grid: 0 },
    { grid: 1, duration: 1.1, ease: EASE.out },
    scene.start + SCENE_LEAD,
  );
  tl.fromTo(state, { clips: 0 }, { clips: 1, duration: 1.2, ease: EASE.out }, scene.start + 0.5);
  tl.fromTo(
    state,
    { drift: 0 },
    { drift: 1, duration: 1.3, ease: EASE.inOut },
    cue(cues, 'problem.rarely'),
  );
  tl.fromTo(state, { collapse: 0 }, { collapse: 1, duration: 0.9, ease: EASE.in }, collapseAt);

  layers.add({
    parent: root,
    width: PANEL.w,
    height: PANEL.h,
    start: scene.start,
    end: scene.end,
    draw: (ctx2d) => drawPanel(ctx2d, state),
    className: 'abs',
  }).style.cssText += `left:${PANEL.x}px;top:${PANEL.y}px;`;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ grid: number, clips: number, drift: number, collapse: number }} state
 */
function drawPanel(ctx, state) {
  const keep = 1 - state.collapse;
  const middle = PANEL.h / 2;
  for (let i = 0; i < LINE_COUNT; i += 1) {
    const progress = EASE.out(clamp01(state.grid * 1.6 - i * 0.035));
    const half = middle * progress * keep;
    const x = i * BEAT_WIDTH + 0.5;
    strokeLine(ctx, x, middle - half, x, middle + half, PALETTE.lineStrong, keep * 0.7);
    strokeLine(
      ctx,
      x,
      TICK_Y - 8 * progress * keep,
      x,
      TICK_Y + 8 * progress * keep,
      PALETTE.accent,
      keep,
    );
  }
  CLIPS.forEach(([beat, span, drift], index) => {
    const arrival = EASE.out(clamp01(state.clips * 1.7 - index * 0.2));
    const aligned = (beat ?? 0) * BEAT_WIDTH;
    const x = aligned + (drift ?? 0) * EASE.inOut(state.drift) + (1 - arrival) * 520;
    const width = (span ?? 1) * BEAT_WIDTH;
    const alpha = arrival * keep;
    roundedRect(ctx, x + 0.5, CUT_Y + 0.5, width, CUT_HEIGHT, CUT_RADIUS);
    ctx.fillStyle = rgba(PALETTE.surface, alpha);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(PALETTE.textDim, alpha);
    ctx.stroke();
    const offset = x - aligned;
    if (Math.abs(offset) > 1.5 && state.drift > 0) {
      const y = CUT_Y + CUT_HEIGHT + 22;
      strokeLine(ctx, aligned, y, x, y, PALETTE.accent, state.drift * keep, 1.5);
      strokeLine(ctx, aligned, y - 6, aligned, y + 6, PALETTE.accent, state.drift * keep);
      strokeLine(ctx, x, y - 6, x, y + 6, PALETTE.accent, state.drift * keep);
    }
  });
}
