/** 0:45 Quality. A detailed live frame, then the three claims as chips. */

import { COPY, PALETTE, VIDEO } from '../../config/video.config.js';
import { cue } from '../../core/cues.js';
import { pulse } from '../../core/score.js';
import { canvasCard } from '../components.js';
import { el, place } from '../dom.js';
import { drawLook } from '../draw/looks.js';
import { circle, disc, line, roundedRect } from '../draw/primitives.js';
import { DURATION, exitTime, leave, riseIn, SCENE_LEAD } from '../motion.js';

const FRAME = { x: 360, y: 100, w: 1200, h: 675 };
const CHIP_ROW_Y = 820;

/**
 * @param {import('../film.js').SceneContext} ctx
 */
export function buildQuality(ctx) {
  const { tl, scene, root, cues, kicks } = ctx;
  const claimCues = ['quality.premium', 'quality.realtime', 'quality.gpu'];

  const frame = canvasCard(ctx, {
    parent: root,
    box: FRAME,
    draw: (c, t, w, h) => {
      const beat = pulse(kicks, t, 0.25);
      drawLook(c, 'contours', {
        w,
        h,
        t,
        seed: VIDEO.seed + 12,
        pulse: beat,
        detail: 1.9,
        floor: PALETTE.surface,
      });
      disc(c, 40, 40, 5 + beat * 1.5, PALETTE.accent);
      circle(c, 40, 40, 11 + beat * 5, PALETTE.accent, 0.6 * (1 - beat * 0.4));
      drawGpuGlyph(c, w - 66, 40);
    },
  });
  const live = el('div', 'label', frame, COPY.quality.live);
  live.style.color = PALETTE.text;
  place(live, { x: 66, y: 31 });
  const gpu = el('div', 'label', frame, COPY.quality.gpu);
  gpu.style.color = PALETTE.text;
  place(gpu, { x: FRAME.w - 150, y: 31 });
  riseIn(tl, frame, scene.start + SCENE_LEAD, { y: 28, duration: DURATION.long });

  const row = el('div', 'abs', root);
  place(row, { x: 0, y: CHIP_ROW_Y, w: VIDEO.layoutWidth });
  row.style.display = 'flex';
  row.style.justifyContent = 'center';
  row.style.columnGap = '18px';
  const chips = COPY.quality.chips.map((text, index) => {
    const chip = el('div', 'chip', row, text);
    chip.style.color = PALETTE.text;
    chip.style.position = 'relative';
    riseIn(tl, chip, cue(cues, claimCues[index] ?? 'quality.premium'), {
      y: 18,
      duration: DURATION.short,
    });
    return chip;
  });

  leave(tl, [frame, ...chips], exitTime(scene));
}

/**
 * A small processor glyph: a square with pins.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x Centre.
 * @param {number} y Centre.
 */
function drawGpuGlyph(c, x, y) {
  const half = 9;
  roundedRect(c, x - half, y - half, half * 2, half * 2, 3);
  c.lineWidth = 1.4;
  c.strokeStyle = PALETTE.text;
  c.stroke();
  for (const offset of [-4, 4]) {
    line(c, x + offset, y - half - 5, x + offset, y - half, PALETTE.text, 1, 1.4);
    line(c, x + offset, y + half, x + offset, y + half + 5, PALETTE.text, 1, 1.4);
    line(c, x - half - 5, y + offset, x - half, y + offset, PALETTE.text, 1, 1.4);
    line(c, x + half, y + offset, x + half + 5, y + offset, PALETTE.text, 1, 1.4);
  }
}
