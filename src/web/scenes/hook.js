/** 0:00 Hook. A hairline wakes up as a waveform and kicks with the beat. */

import { COPY, VIDEO } from '../../config/video.config.js';
import { cue } from '../../core/cues.js';
import { drawPulseLine } from '../draw/pulse-line.js';
import { place, wordRow } from '../dom.js';
import { DURATION, EASE, exitTime, leave, maskIn } from '../motion.js';

const BASELINE_Y = 650;
const AMPLITUDE = 150;
/** Seconds a word starts rising before it is spoken, so it lands with the voice. */
const WORD_LEAD = 0.1;

/**
 * @param {import('../film.js').SceneContext} ctx
 */
export function buildHook(ctx) {
  const { tl, scene, root, cues, layers, kicks } = ctx;
  const line = ctx.line('hook');
  const { row, inners } = wordRow(root, COPY.hook.words, {
    className: 'display',
    accentIndexes: [COPY.hook.accentWord],
  });
  place(row, { x: 0, y: 400, w: VIDEO.layoutWidth });
  inners.forEach((inner, index) => {
    const word = line.words[index];
    if (word) {
      maskIn(tl, inner, word.start - WORD_LEAD, { duration: DURATION.base });
    }
  });

  const state = { y: BASELINE_Y, grow: 0, ignite: 0, amplitude: AMPLITUDE };
  tl.fromTo(state, { grow: 0 }, { grow: 1, duration: 1.2, ease: EASE.out }, scene.start + 0.05);
  tl.fromTo(
    state,
    { ignite: 0 },
    { ignite: 1, duration: 0.35, ease: EASE.out },
    cue(cues, 'hook.ignite'),
  );
  tl.to(state, { ignite: 0, duration: 0.5, ease: EASE.inOut }, scene.end - 0.5);

  layers.add({
    parent: root,
    width: VIDEO.layoutWidth,
    height: VIDEO.layoutHeight,
    start: scene.start,
    end: scene.end,
    draw: (ctx2d, t) => drawPulseLine(ctx2d, t, state, kicks),
  });

  leave(tl, row, exitTime(scene));
}
