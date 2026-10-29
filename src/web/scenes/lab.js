/** 0:49 Lab. A self-serve subscription lab, with early access open. */

import { BRAND, COPY, PALETTE } from '../../config/video.config.js';
import { cue } from '../../core/cues.js';
import { el, place } from '../dom.js';
import { DURATION, EASE, exitTime, leave, riseIn } from '../motion.js';

const CARD = { x: 600, y: 230, w: 720, h: 480 };
const ROW_Y = 180;
const ROW_PITCH = 96;

/**
 * @param {import('../film.js').SceneContext} ctx
 */
export function buildLab(ctx) {
  const { tl, scene, root, cues } = ctx;
  const { title, rows, pill } = COPY.lab;
  const rowCues = ['lab.self', 'lab.subscription'];

  const card = el('div', 'card', root);
  place(card, CARD);
  riseIn(tl, card, scene.start + 0.05, { y: 28, duration: DURATION.long });

  const mark = el('div', 'dot', card);
  place(mark, { x: 44, y: 53, w: 12, h: 12 });
  const brand = el('div', 'title strong nowrap', card, BRAND.name);
  place(brand, { x: 72, y: 38 });
  const heading = el('div', 'label', card, title);
  place(heading, { x: 44, y: 126 });
  const divider = el('div', 'hairline', card);
  place(divider, { x: 44, y: 112, w: CARD.w - 88, h: 1 });

  rows.forEach((text, index) => {
    const y = ROW_Y + index * ROW_PITCH;
    const bullet = el('div', 'dot', card);
    place(bullet, { x: 44, y: y + 36, w: 10, h: 10 });
    const label = el('div', 'headline nowrap', card, text);
    place(label, { x: 80, y });
    const at = cue(cues, rowCues[index] ?? 'lab.self');
    riseIn(tl, [bullet, label], at, { y: 18, duration: DURATION.base });
  });

  const badge = el('div', 'chip', card);
  place(badge, { x: 44, y: CARD.h - 100 });
  const status = el('span', 'dot', badge);
  status.style.position = 'relative';
  status.style.width = '8px';
  status.style.height = '8px';
  el('span', 'strong', badge, pill);
  badge.style.borderColor = PALETTE.accent;
  riseIn(tl, badge, cue(cues, 'lab.subscription') + 0.35, { y: 14, duration: DURATION.base });
  tl.fromTo(
    divider,
    { scaleX: 0 },
    { scaleX: 1, duration: DURATION.long, ease: EASE.out, transformOrigin: '0 50%' },
    scene.start + 0.3,
  );

  leave(tl, card, exitTime(scene));
}
