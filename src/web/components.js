/** Reusable pieces that more than one scene builds: a card holding a live canvas. */

import { el, place } from './dom.js';

/**
 * A bordered card whose inside is a canvas redrawn on every seek.
 * @param {import('./film.js').SceneContext} ctx
 * @param {object} options
 * @param {HTMLElement} options.parent
 * @param {{ x: number, y: number, w: number, h: number }} options.box Layout pixels.
 * @param {(c: CanvasRenderingContext2D, t: number, w: number, h: number) => void} options.draw
 * @returns {HTMLElement} The card, ready to be animated.
 */
export function canvasCard(ctx, options) {
  const { parent, box, draw } = options;
  const card = el('div', 'card', parent);
  place(card, box);
  const width = box.w - 2;
  const height = box.h - 2;
  ctx.layers.add({
    parent: card,
    width,
    height,
    start: ctx.scene.start,
    end: ctx.scene.end,
    draw: (c, t) => draw(c, t, width, height),
  });
  return card;
}
