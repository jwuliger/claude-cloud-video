/** Voiceover captions: one sentence at a time, each word brightening as it is spoken. */

import { DURATION, EASE } from './motion.js';
import { PALETTE } from '../config/video.config.js';
import { captionChunks } from '../core/voiceover.js';
import { el } from './dom.js';

/** Seconds a caption appears before its first word is spoken. */
const LEAD = 0.14;
/** Seconds a caption stays after its last word. */
const HOLD = 0.55;
const FADE_OUT = 0.3;
const MIN_FADE_OUT = 0.12;
/** Minimum quiet gap between one caption leaving and the next arriving. */
const GAP = 0.04;

/**
 * @param {import('./motion.js').Timeline} tl
 * @param {HTMLElement} stage
 * @param {readonly import('../core/voiceover.js').ResolvedLine[]} lines
 */
export function buildCaptions(tl, stage, lines) {
  const container = el('div', 'captions', stage);
  const chunks = lines.flatMap((line) => captionChunks(line));

  chunks.forEach((chunk, index) => {
    const node = el('div', 'caption', container);
    const wordNodes = chunk.words.map((word, i) => {
      node.append(i === 0 ? '' : ' ');
      return el('span', 'w', node, word.text);
    });

    const next = chunks[index + 1];
    const showAt = chunk.start - LEAD;
    const nextShowAt = next ? next.start - LEAD : Infinity;
    const hideAt = Math.max(chunk.end, Math.min(chunk.end + HOLD, nextShowAt - FADE_OUT - GAP));
    const fade = Math.max(MIN_FADE_OUT, Math.min(FADE_OUT, nextShowAt - GAP - hideAt));

    tl.fromTo(
      node,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: DURATION.short, ease: EASE.out },
      showAt,
    );
    chunk.words.forEach((word, i) => {
      tl.to(
        wordNodes[i] ?? node,
        { color: PALETTE.text, duration: 0.16, ease: EASE.out },
        word.start,
      );
    });
    tl.to(node, { opacity: 0, duration: fade, ease: EASE.out }, hideAt);
  });
}
