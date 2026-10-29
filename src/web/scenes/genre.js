/** 0:27 Genre. The song is classified and the look adapts to match. */

import { COPY, PALETTE, VIDEO } from '../../config/video.config.js';
import { cue } from '../../core/cues.js';
import { pulse } from '../../core/score.js';
import { canvasCard } from '../components.js';
import { el, maskedWord, place } from '../dom.js';
import { crossfadeFloor, drawLook } from '../draw/looks.js';
import { DURATION, EASE, exitTime, leave, maskIn, riseIn, SCENE_LEAD } from '../motion.js';

const LIST = { x: 120, y: 330, pitch: 104, w: 560, h: 92 };
const PREVIEW = { x: 800, y: 250, w: 1000, h: 520 };
const SCAN_STEP = 0.15;

/**
 * @param {import('../film.js').SceneContext} ctx
 */
export function buildGenre(ctx) {
  const { tl, scene, root, cues, kicks } = ctx;
  const items = COPY.genre.items;
  const lock = cue(cues, 'genre.lock');
  const hops = [lock, cue(cues, 'genre.adapts'), cue(cues, 'genre.look'), cue(cues, 'genre.fit')];
  const weights = items.map(() => ({ alpha: 0 }));
  const open = scene.start + SCENE_LEAD;

  const heading = el('div', 'label', root, COPY.genre.label);
  place(heading, { x: LIST.x, y: LIST.y - 64 });
  const dot = el('div', 'dot', root);
  place(dot, { x: LIST.x + 188, y: LIST.y - 60, w: 8, h: 8 });
  riseIn(tl, [heading, dot], open, { y: 12, duration: DURATION.short });

  const indicator = el('div', 'card', root);
  place(indicator, { x: LIST.x - 20, y: LIST.y - 8, w: LIST.w, h: LIST.h });
  indicator.style.background = 'transparent';
  indicator.style.borderColor = PALETTE.accent;
  indicator.style.borderRadius = '14px';
  const rowY = (/** @type {number} */ index) => LIST.y - 8 + index * LIST.pitch;
  const rows = items.map((item, index) => {
    const word = maskedWord(root, item.name, 'headline nowrap dim');
    place(word.outer, { x: LIST.x, y: LIST.y + index * LIST.pitch });
    maskIn(tl, word.inner, open + 0.05 + index * 0.08);
    return word.outer;
  });
  tl.fromTo(
    indicator,
    { opacity: 0, y: rowY(0) - LIST.y + 8 },
    { opacity: 1, duration: 0.3 },
    open + 0.1,
  );

  scanThenLock(tl, indicator, lock, rowY);
  hops.forEach((at, index) => {
    const row = rows[index];
    if (!row) {
      return;
    }
    tl.to(row, { color: PALETTE.text, duration: 0.2 }, at);
    tl.to(row, { color: PALETTE.textDim, duration: 0.3 }, hops[index + 1] ?? scene.end);
    if (index > 0) {
      tl.to(indicator, { y: rowY(index) - LIST.y + 8, duration: 0.5, ease: EASE.inOut }, at);
    }
    const weight = weights[index];
    if (weight) {
      // The first look fades in while the selection is still scanning, so the card is never empty.
      const fadeAt = index === 0 ? at - 0.55 : at;
      tl.fromTo(weight, { alpha: 0 }, { alpha: 1, duration: 0.6, ease: EASE.inOut }, fadeAt);
      const next = hops[index + 1];
      if (next !== undefined) {
        tl.to(weight, { alpha: 0, duration: 0.6, ease: EASE.inOut }, next);
      }
    }
  });

  const preview = canvasCard(ctx, {
    parent: root,
    box: PREVIEW,
    draw: (c, t, w, h) => {
      items.forEach((item, index) => {
        const alpha = weights[index]?.alpha ?? 0;
        if (alpha > 0.005) {
          drawLook(c, item.look, {
            w,
            h,
            t,
            seed: VIDEO.seed + index * 31,
            pulse: pulse(kicks, t, 0.25),
            alpha,
            floor: crossfadeFloor(alpha),
          });
        }
      });
    },
  });
  riseIn(tl, preview, open + 0.1, { y: 24, duration: DURATION.base });

  leave(tl, [heading, dot, indicator, preview, ...rows], exitTime(scene));
}

/**
 * The selection box hops through the genres quickly, then settles on the first one.
 * @param {import('../motion.js').Timeline} tl
 * @param {HTMLElement} indicator
 * @param {number} lock Time the first genre is locked in.
 * @param {(index: number) => number} rowY
 */
function scanThenLock(tl, indicator, lock, rowY) {
  const order = [1, 2, 3, 0];
  order.forEach((index, step) => {
    const at = lock - SCAN_STEP * (order.length - step);
    tl.to(
      indicator,
      { y: rowY(index) - LIST.y + 8, duration: SCAN_STEP * 0.8, ease: EASE.inOut },
      at,
    );
  });
}
