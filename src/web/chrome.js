/** Persistent brand bar and the honesty footnote shown over illustrative previews. */

import { BRAND, COPY, LAYOUT } from '../config/video.config.js';
import { cue } from '../core/cues.js';
import { el, place } from './dom.js';
import { DURATION, EASE } from './motion.js';

/**
 * @param {import('./motion.js').Timeline} tl
 * @param {HTMLElement} stage
 * @param {Readonly<Record<string, number>>} cues
 */
export function buildChrome(tl, stage, cues) {
  const bar = el('div', 'layer', stage);
  bar.style.pointerEvents = 'none';

  const mark = el('div', 'dot', bar);
  place(mark, { x: LAYOUT.margin, y: LAYOUT.topBar + 4, w: 10, h: 10 });
  const name = el('div', 'label mid', bar, BRAND.name);
  place(name, { x: LAYOUT.margin + 24, y: LAYOUT.topBar });

  const domain = el('div', 'label', bar, BRAND.domain);
  domain.style.textTransform = 'none';
  domain.style.letterSpacing = '0.08em';
  domain.style.textAlign = 'right';
  place(domain, { x: 1920 - LAYOUT.margin - 400, y: LAYOUT.topBar, w: 400 });

  const note = el('div', 'label', bar, COPY.illustrativeNote);
  place(note, { x: LAYOUT.margin, y: 1080 - LAYOUT.captionBottom - 20 });

  const brandItems = [mark, name, domain];
  tl.fromTo(
    brandItems,
    { opacity: 0 },
    { opacity: 1, duration: DURATION.base, stagger: 0.08, ease: EASE.out },
    cue(cues, 'chrome.in'),
  );
  tl.to(
    brandItems,
    { opacity: 0, duration: DURATION.short, ease: EASE.in },
    cue(cues, 'chrome.out'),
  );
  tl.fromTo(
    note,
    { opacity: 0 },
    { opacity: 1, duration: DURATION.base, ease: EASE.out },
    cue(cues, 'note.in'),
  );
  tl.to(note, { opacity: 0, duration: DURATION.short, ease: EASE.in }, cue(cues, 'note.out'));
}
