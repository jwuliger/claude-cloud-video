/** 0:52 Call to action. The mark pulses with the beat while the domain resolves. */

import { COPY, PALETTE, VIDEO } from '../../config/video.config.js';
import { cue } from '../../core/cues.js';
import { drawRingPulses } from '../draw/ring-pulses.js';
import { el, maskedWord, place, wordRow } from '../dom.js';
import { DURATION, EASE, maskIn } from '../motion.js';

const MARK_SIZE = 32;
const MARK_Y = 330;
const HEADLINE_Y = 430;
const DOMAIN_Y = 620;
const UNDERLINE_GAP = 22;
const WORD_CUES = ['cta.join', 'cta.early', 'cta.access'];

/**
 * @param {import('../film.js').SceneContext} ctx
 */
export function buildCta(ctx) {
  const { tl, scene, root, cues, layers, kicks } = ctx;
  const drop = cue(cues, 'cta.drop');
  const beats = [...kicks, ...COPY.cta.tailPulses];
  const centreX = VIDEO.layoutWidth / 2;

  const mark = el('div', 'dot', root);
  place(mark, {
    x: centreX - MARK_SIZE / 2,
    y: MARK_Y - MARK_SIZE / 2,
    w: MARK_SIZE,
    h: MARK_SIZE,
  });
  tl.fromTo(mark, { scale: 0 }, { scale: 1, duration: DURATION.base, ease: EASE.out }, drop);

  const { row, inners } = wordRow(root, COPY.cta.headline, { className: 'display' });
  place(row, { x: 0, y: HEADLINE_Y, w: VIDEO.layoutWidth });
  inners.forEach((inner, index) => {
    maskIn(tl, inner, cue(cues, WORD_CUES[index] ?? 'cta.join'));
  });

  const domain = maskedWord(root, COPY.cta.domain, 'headline accent nowrap');
  place(domain.outer, { x: 0, y: DOMAIN_Y });
  const width = domain.inner.offsetWidth || 760;
  place(domain.outer, { x: centreX - width / 2, y: DOMAIN_Y });
  const domainAt = cue(cues, 'cta.domain');
  maskIn(tl, domain.inner, domainAt);

  const underline = el('div', 'hairline', root);
  underline.style.background = PALETTE.accent;
  place(underline, { x: centreX - width / 2, y: DOMAIN_Y + 76 + UNDERLINE_GAP, w: width, h: 2 });
  underline.style.transformOrigin = '0 50%';
  tl.fromTo(
    underline,
    { scaleX: 0 },
    { scaleX: 1, duration: DURATION.long, ease: EASE.out },
    domainAt + 0.2,
  );

  layers.add({
    parent: root,
    width: VIDEO.layoutWidth,
    height: VIDEO.layoutHeight,
    start: scene.start,
    end: scene.end,
    draw: (c, t) =>
      drawRingPulses(c, t, beats, {
        x: centreX,
        y: MARK_Y,
        startRadius: MARK_SIZE / 2 + 8,
        endRadius: 420,
        life: 1.8,
        from: scene.start,
        to: scene.end,
      }),
  });
}
