/** 0:37 Seed. A number rolls into place and four tiles, one per seed, are all different. */

import { COPY, PALETTE, TYPE, VIDEO } from '../../config/video.config.js';
import { cue } from '../../core/cues.js';
import { createRng } from '../../core/rng.js';
import { pulse } from '../../core/score.js';
import { canvasCard } from '../components.js';
import { el, place } from '../dom.js';
import { drawLook } from '../draw/looks.js';
import { DURATION, EASE, leave, riseIn } from '../motion.js';

const DIGIT_COPIES = 3;
const DIGIT_STRIP = DIGIT_COPIES * 10;
const TILE = { w: 390, h: 219, gap: 40, y: 500 };
const ROLL_SEED = 5;
const GROUP_AFTER = [1, 4];

/**
 * @param {import('../film.js').SceneContext} ctx
 */
export function buildSeed(ctx) {
  const { tl, scene, root, cues, kicks } = ctx;
  const start = cue(cues, 'seed.start');
  const alike = cue(cues, 'seed.alike');

  const label = el('div', 'label', root, COPY.seed.label);
  place(label, { x: 0, y: 150, w: VIDEO.layoutWidth });
  label.style.textAlign = 'center';
  riseIn(tl, label, start, { y: 10, duration: DURATION.short });

  const odometer = buildOdometer(root, COPY.seed.digits);
  riseIn(tl, odometer.row, start, { y: 0, duration: DURATION.short });
  const rng = createRng(ROLL_SEED);
  odometer.columns.forEach((column, index) => {
    const digit = Number(COPY.seed.digits[index]);
    const from = -((Math.floor(rng() * 10) + 0) * 100) / DIGIT_STRIP;
    const to = -((20 + digit) * 100) / DIGIT_STRIP;
    tl.fromTo(
      column,
      { yPercent: from },
      { yPercent: to, duration: 1.1 + index * 0.08, ease: EASE.out },
      start + 0.05,
    );
  });

  const tiles = COPY.seed.tiles.map((seed, index) => {
    const x = 120 + index * (TILE.w + TILE.gap);
    const card = canvasCard(ctx, {
      parent: root,
      box: { x, y: TILE.y, w: TILE.w, h: TILE.h },
      draw: (c, t, w, h) =>
        drawLook(c, 'contours', {
          w,
          h,
          t,
          seed,
          pulse: pulse(kicks, t, 0.25),
          floor: PALETTE.surface,
          detail: 0.75,
        }),
    });
    const caption = el('div', 'label', root, `${COPY.seed.tileLabel} ${seed}`);
    place(caption, { x, y: TILE.y + TILE.h + 22 });
    return { card, caption };
  });
  tiles.forEach(({ card, caption }, index) => {
    const at = cue(cues, 'seed.land') - 0.25 + index * 0.14;
    riseIn(tl, [card, caption], at, { y: 26, duration: DURATION.base });
    tl.to(card, { borderColor: PALETTE.accent, duration: 0.12 }, alike + index * 0.17);
    tl.to(
      card,
      { borderColor: PALETTE.lineStrong, duration: 0.5, ease: EASE.inOut },
      alike + index * 0.17 + 0.3,
    );
  });

  leave(
    tl,
    [label, odometer.row, ...tiles.flatMap(({ card, caption }) => [card, caption])],
    scene.end - 0.4,
  );
}

/**
 * A row of digit slots. Each slot shows one digit of a strip that can be rolled with a tween.
 * @param {HTMLElement} parent
 * @param {string} digits
 * @returns {{ row: HTMLElement, columns: HTMLElement[] }}
 */
function buildOdometer(parent, digits) {
  const row = el('div', 'display', parent);
  place(row, { x: 0, y: 190, w: VIDEO.layoutWidth });
  row.style.display = 'flex';
  row.style.justifyContent = 'center';
  row.style.fontSize = `${TYPE.size.display}px`;
  const columns = [...digits].map((_, index) => {
    const slot = el('div', '', row);
    slot.style.overflow = 'hidden';
    slot.style.height = '1.08em';
    slot.style.width = '0.62em';
    slot.style.textAlign = 'center';
    slot.style.setProperty(
      'mask-image',
      'linear-gradient(transparent, #000 22%, #000 78%, transparent)',
    );
    if (GROUP_AFTER.includes(index - 1)) {
      slot.style.marginLeft = '0.3em';
    }
    const column = el('div', '', slot);
    for (let i = 0; i < DIGIT_STRIP; i += 1) {
      const cell = el('div', '', column, String(i % 10));
      cell.style.height = '1.08em';
      cell.style.lineHeight = '1.08em';
    }
    return column;
  });
  return { row, columns };
}
