/** 0:34 Camera. A wireframe flight that never holds still, with its path traced in an inset. */

import { COPY, PALETTE, VIDEO } from '../../config/video.config.js';
import { cue } from '../../core/cues.js';
import { rgba } from '../../core/color.js';
import { canvasCard } from '../components.js';
import { el, maskedWord, place } from '../dom.js';
import { drawFlight, drawPathMap } from '../draw/scene3d.js';
import { DURATION, leave, maskIn, riseIn } from '../motion.js';

const INSET = { x: 1480, y: 640, w: 320, h: 230 };

/**
 * @param {import('../film.js').SceneContext} ctx
 */
export function buildCamera(ctx) {
  const { tl, scene, root, cues, layers } = ctx;
  const seed = VIDEO.seed + 3;

  const view = layers.add({
    parent: root,
    width: VIDEO.layoutWidth,
    height: VIDEO.layoutHeight,
    start: scene.start,
    end: scene.end,
    draw: (c, t) => {
      drawFlight(c, t, { width: VIDEO.layoutWidth, height: VIDEO.layoutHeight, seed });
      drawVignette(c);
    },
  });
  riseIn(tl, view, scene.start, { y: 0, duration: 0.6 });

  const headline = maskedWord(root, COPY.camera.headline, 'headline nowrap');
  place(headline.outer, { x: 120, y: 130 });
  maskIn(tl, headline.inner, cue(cues, 'camera.moving'));
  const sub = maskedWord(root, COPY.camera.sub, 'title mid nowrap');
  place(sub.outer, { x: 120, y: 226 });
  maskIn(tl, sub.inner, cue(cues, 'camera.unique'));

  const inset = canvasCard(ctx, {
    parent: root,
    box: INSET,
    draw: (c, t, w, h) => {
      c.fillStyle = PALETTE.surface;
      c.fillRect(0, 0, w, h);
      drawPathMap(c, t, w, h, seed);
    },
  });
  const label = el('div', 'label', inset, COPY.camera.inset);
  place(label, { x: 20, y: 18 });
  riseIn(tl, inset, cue(cues, 'camera.moving') + 0.1, { y: 20, duration: DURATION.base });

  leave(tl, [view, headline.outer, sub.outer, inset], scene.end - 0.4, { y: 0 });
}

/**
 * Darken the frame edges so the flight sits inside the scene instead of filling it.
 * @param {CanvasRenderingContext2D} c
 */
function drawVignette(c) {
  const { layoutWidth: w, layoutHeight: h } = VIDEO;
  const vignette = c.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.62);
  vignette.addColorStop(0, rgba(PALETTE.bg, 0));
  vignette.addColorStop(1, rgba(PALETTE.bg, 0.95));
  c.fillStyle = vignette;
  c.fillRect(0, 0, w, h);
  const top = c.createLinearGradient(0, 0, 0, 340);
  top.addColorStop(0, rgba(PALETTE.bg, 0.9));
  top.addColorStop(1, rgba(PALETTE.bg, 0));
  c.fillStyle = top;
  c.fillRect(0, 0, w, 340);
}
