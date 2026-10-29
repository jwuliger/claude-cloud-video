/** 0:41 Choose. Pick an experience, then change the backdrop and the caption style. */

import { COPY, PALETTE, TYPE, VIDEO } from '../../config/video.config.js';
import { cue } from '../../core/cues.js';
import { rgba } from '../../core/color.js';
import { pulse } from '../../core/score.js';
import { canvasCard } from '../components.js';
import { el, place, tagLabel } from '../dom.js';
import { crossfadeFloor, drawLook, NO_FLOOR } from '../draw/looks.js';
import { line } from '../draw/primitives.js';
import { DURATION, EASE, exitTime, leave, riseIn, SCENE_LEAD } from '../motion.js';

const PREVIEW = { x: 720, y: 150, w: 1080, h: 640 };
const ROW = { x: 120, w: 520, h: 54, gap: 10 };
const CHIP_GAP = 14;
const GRID_STEP = 40;

/**
 * Style a control as selected or not, as a plain inline style the timeline can tween from.
 * @param {HTMLElement} node
 * @param {boolean} active
 */
function setActive(node, active) {
  node.style.borderColor = active ? PALETTE.accent : PALETTE.lineStrong;
  labelOf(node).style.color = active ? PALETTE.text : PALETTE.textDim;
}

/**
 * The element whose colour shows the selection: a tag's text, or the control itself.
 * @param {HTMLElement} node
 * @returns {HTMLElement}
 */
function labelOf(node) {
  return node.querySelector('.txt') ?? node;
}

/**
 * Move the selection highlight within a group at a given time.
 * @param {import('../motion.js').Timeline} tl
 * @param {readonly HTMLElement[]} nodes
 * @param {number} active Index to select.
 * @param {number} at
 */
function select(tl, nodes, active, at) {
  nodes.forEach((node, index) => {
    const on = index === active;
    const ease = EASE.out;
    tl.to(
      node,
      { borderColor: on ? PALETTE.accent : PALETTE.lineStrong, duration: 0.25, ease },
      at,
    );
    tl.to(labelOf(node), { color: on ? PALETTE.text : PALETTE.textDim, duration: 0.25, ease }, at);
  });
}

/**
 * Crossfade between stacked variants so exactly one is visible after each switch.
 * @param {import('../motion.js').Timeline} tl
 * @param {{ alpha: number }[]} weights
 * @param {number} active
 * @param {number} at
 */
function crossfade(tl, weights, active, at) {
  weights.forEach((weight, index) => {
    tl.to(weight, { alpha: index === active ? 1 : 0, duration: 0.5, ease: EASE.inOut }, at);
  });
}

/**
 * @param {import('../film.js').SceneContext} ctx
 */
export function buildChoose(ctx) {
  const { tl, scene, root, cues, kicks } = ctx;
  const { experience, backdrop, captions } = COPY.choose;
  const expAt = cue(cues, 'choose.experience');
  const bdAt = cue(cues, 'choose.backdrop');
  const capAt = cue(cues, 'choose.captions');
  const entrance = scene.start + SCENE_LEAD;

  const looks = experience.looks.map((_, i) => ({ alpha: i === 0 ? 1 : 0 }));
  const grounds = backdrop.items.map((_, i) => ({ alpha: i === 0 ? 1 : 0 }));

  const groupLabel = (/** @type {string} */ text, /** @type {number} */ y) => {
    const node = el('div', 'label', root, text);
    return place(node, { x: ROW.x, y });
  };
  const labels = [
    groupLabel(experience.label, 120),
    groupLabel(backdrop.label, 500),
    groupLabel(captions.label, 650),
  ];

  const rows = experience.looks.map((_, index) => {
    const row = el('div', 'card', root);
    place(row, { x: ROW.x, y: 156 + index * (ROW.h + ROW.gap), w: ROW.w, h: ROW.h });
    row.style.background = 'transparent';
    row.style.borderRadius = '12px';
    row.style.padding = '0 22px';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    tagLabel(row, String(index + 1).padStart(2, '0'), experience.looks[index] ?? experience.label);
    setActive(row, index === 0);
    return row;
  });

  /**
   * @param {readonly string[]} items
   * @param {number} y
   */
  const chipRow = (items, y) => {
    const holder = el('div', 'abs', root);
    place(holder, { x: ROW.x, y });
    holder.style.display = 'flex';
    holder.style.columnGap = `${CHIP_GAP}px`;
    return items.map((text, index) => {
      const chip = el('div', 'chip', holder, text);
      chip.style.position = 'relative';
      setActive(chip, index === 0);
      return chip;
    });
  };
  const swatches = chipRow(backdrop.items, 536);
  const styles = chipRow(captions.items, 686);

  const controls = [...labels, ...rows, ...swatches, ...styles];
  riseIn(tl, controls, entrance, { y: 18, stagger: 0.03, duration: DURATION.base });

  const preview = canvasCard(ctx, {
    parent: root,
    box: PREVIEW,
    draw: (c, t, w, h) =>
      drawPreview(c, t, w, h, { looks, grounds, kicks, names: experience.looks }),
  });
  riseIn(tl, preview, entrance + 0.1, { y: 24, duration: DURATION.base });

  const sample = captions.items.map((_, index) => {
    const node = el('div', 'nowrap', preview, captions.sample);
    place(node, { x: 0, y: PREVIEW.h - 150, w: PREVIEW.w });
    node.style.textAlign = 'center';
    node.style.color = PALETTE.text;
    styleCaption(node, index);
    return node;
  });
  sample.forEach((node, index) => {
    if (index === 0) {
      return;
    }
    tl.fromTo(
      node,
      { opacity: 0 },
      { opacity: 1, duration: 0.3 },
      capAt + 0.12 + (index - 1) * 0.43,
    );
  });
  tl.to(sample[0] ?? preview, { opacity: 0, duration: 0.3 }, capAt + 0.12);
  tl.to(sample[1] ?? preview, { opacity: 0, duration: 0.3 }, capAt + 0.55);

  [1, 2].forEach((index) => {
    const at = expAt + 0.15 + (index - 1) * 0.5;
    select(tl, rows, index, at);
    crossfade(tl, looks, index, at);
  });
  [1, 2].forEach((index) => {
    const at = bdAt + 0.15 + (index - 1) * 0.45;
    select(tl, swatches, index, at);
    crossfade(tl, grounds, index, at);
  });
  [1, 2].forEach((index) => select(tl, styles, index, capAt + 0.12 + (index - 1) * 0.43));

  leave(tl, [...controls, preview], exitTime(scene));
}

/**
 * The three caption styles shown in the preview.
 * @param {HTMLElement} node
 * @param {number} variant 0 minimal, 1 bold, 2 outline.
 */
function styleCaption(node, variant) {
  const bold = variant > 0;
  node.style.fontSize = bold ? '72px' : '44px';
  node.style.fontWeight = String(bold ? TYPE.weight.semibold : TYPE.weight.regular);
  node.style.letterSpacing = bold ? '-0.035em' : '-0.01em';
  if (variant === 2) {
    node.style.color = 'transparent';
    node.style.setProperty('-webkit-text-stroke', `1.5px ${PALETTE.text}`);
  }
}

/**
 * @typedef {object} PreviewState
 * @property {{ alpha: number }[]} looks Weight of each look.
 * @property {{ alpha: number }[]} grounds Weight of each backdrop.
 * @property {readonly number[]} kicks
 * @property {readonly string[]} names Look names, in the same order as `looks`.
 */

/**
 * @param {CanvasRenderingContext2D} c
 * @param {number} t
 * @param {number} w
 * @param {number} h
 * @param {PreviewState} state
 */
function drawPreview(c, t, w, h, state) {
  const [, grid, glow] = state.grounds.map((ground) => ground.alpha);
  if (grid) {
    for (let x = GRID_STEP; x < w; x += GRID_STEP) {
      line(c, x + 0.5, 0, x + 0.5, h, PALETTE.text, 0.07 * grid, 1);
    }
    for (let y = GRID_STEP; y < h; y += GRID_STEP) {
      line(c, 0, y + 0.5, w, y + 0.5, PALETTE.text, 0.07 * grid, 1);
    }
  }
  if (glow) {
    const gradient = c.createRadialGradient(w / 2, h * 0.62, 0, w / 2, h * 0.62, w * 0.6);
    gradient.addColorStop(0, rgba(PALETTE.accent, 0.2 * glow));
    gradient.addColorStop(1, rgba(PALETTE.accent, 0));
    c.fillStyle = gradient;
    c.fillRect(0, 0, w, h);
  }
  state.names.forEach((name, index) => {
    const alpha = state.looks[index]?.alpha ?? 0;
    if (alpha > 0.005) {
      drawLook(c, name, {
        w,
        h: h * 0.82,
        t,
        seed: VIDEO.seed + index * 17,
        pulse: pulse(state.kicks, t, 0.25),
        alpha,
        floor: grid || glow ? NO_FLOOR : crossfadeFloor(alpha),
      });
    }
  });
}
