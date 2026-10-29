/** 0:08 Product. The mark lands on the downbeat and the name resolves. */

import { BRAND, COPY, VIDEO } from '../../config/video.config.js';
import { cue } from '../../core/cues.js';
import { drawRingPulses } from '../draw/ring-pulses.js';
import { el, maskedWord, place, wordRow } from '../dom.js';
import { DURATION, EASE, leave, maskIn } from '../motion.js';

const MARK_SIZE = 30;
const LOCKUP_Y = 380;
const TAGLINE_Y = 570;
const WORD_LEAD = 0.1;

/**
 * @param {import('../film.js').SceneContext} ctx
 */
export function buildProduct(ctx) {
  const { tl, scene, root, cues, layers, kicks } = ctx;
  const line = ctx.line('product');
  const drop = cue(cues, 'product.drop');

  const lockup = el('div', 'display', root);
  place(lockup, { x: 0, y: LOCKUP_Y, w: VIDEO.layoutWidth });
  lockup.style.display = 'flex';
  lockup.style.justifyContent = 'center';
  lockup.style.alignItems = 'center';
  lockup.style.columnGap = '0.26em';

  const mark = el('div', 'dot', lockup);
  mark.style.position = 'relative';
  mark.style.width = `${MARK_SIZE}px`;
  mark.style.height = `${MARK_SIZE}px`;
  mark.style.marginRight = '0.12em';
  mark.style.top = '0.06em';

  const words = BRAND.name.split(' ').map((word) => maskedWord(lockup, word));
  words.forEach(({ inner }, index) => {
    const spoken = line.words[index];
    maskIn(tl, inner, (spoken?.start ?? drop) - WORD_LEAD);
  });
  tl.fromTo(mark, { scale: 0 }, { scale: 1, duration: DURATION.base, ease: EASE.out }, drop);

  const taglineWords = COPY.product.tagline.split(' ');
  const { row: tagline, inners: taglineInners } = wordRow(root, taglineWords, {
    className: 'title mid',
    gap: '0.28em',
    accentIndexes: [taglineWords.indexOf(COPY.product.taglineAccent)],
  });
  place(tagline, { x: 0, y: TAGLINE_Y, w: VIDEO.layoutWidth });
  maskIn(tl, taglineInners, cue(cues, 'product.music'), { stagger: 0.07 });

  leave(tl, [lockup, tagline], scene.end - 0.45);

  const markCentre = { x: 0, y: LOCKUP_Y + 64 };
  layers.add({
    parent: root,
    width: VIDEO.layoutWidth,
    height: VIDEO.layoutHeight,
    start: scene.start,
    end: scene.end,
    draw: (ctx2d, t) => {
      markCentre.x = mark.offsetLeft + lockup.offsetLeft + MARK_SIZE / 2;
      drawRingPulses(ctx2d, t, kicks, {
        x: markCentre.x,
        y: markCentre.y,
        startRadius: MARK_SIZE / 2 + 8,
        endRadius: 340,
        life: 1.6,
        from: scene.start,
        to: scene.end,
      });
    },
  });
}
