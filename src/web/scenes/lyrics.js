/** 0:31 Lyrics. Each word lands on the beat it belongs to. */

import { COPY, PALETTE, TYPE, VIDEO } from '../../config/video.config.js';
import { cue } from '../../core/cues.js';
import { invLerp } from '../../core/math.js';
import { pulse } from '../../core/score.js';
import { canvasCard } from '../components.js';
import { el, maskedWord, place } from '../dom.js';
import { drawLook } from '../draw/looks.js';
import { disc, line } from '../draw/primitives.js';
import { DURATION, EASE, leave, riseIn } from '../motion.js';

const FRAME = { x: 240, y: 130, w: 1440, h: 700 };
const LINE_HEIGHT = 150;
const TICKER_INSET = 90;
const TICKER_Y = FRAME.h - 70;

/**
 * @param {import('../film.js').SceneContext} ctx
 */
export function buildLyrics(ctx) {
  const { tl, scene, root, cues, kicks } = ctx;
  const { lines, times } = COPY.lyrics;
  const startAt = cue(cues, 'lyrics.start');

  const frame = canvasCard(ctx, {
    parent: root,
    box: FRAME,
    draw: (c, t, w, h) => {
      drawLook(c, 'contours', {
        w,
        h,
        t,
        seed: VIDEO.seed + 5,
        pulse: pulse(kicks, t, 0.25),
        alpha: 0.5,
        floor: PALETTE.surface,
      });
      drawTicker(c, t, w, times);
    },
  });
  riseIn(tl, frame, startAt, { y: 24, duration: DURATION.base });

  let wordIndex = 0;
  lines.forEach((words, lineIndex) => {
    const row = el('div', 'nowrap', frame);
    place(row, { x: 0, y: 170 + lineIndex * LINE_HEIGHT, w: FRAME.w });
    row.style.display = 'flex';
    row.style.justifyContent = 'center';
    row.style.columnGap = '0.28em';
    row.style.fontSize = `${TYPE.size.display}px`;
    row.style.fontWeight = String(TYPE.weight.medium);
    row.style.letterSpacing = TYPE.tracking.display;
    words.forEach((text) => {
      const at = times[wordIndex] ?? startAt;
      const word = maskedWord(row, text, 'dim');
      tl.fromTo(word.inner, { y: 18 }, { y: 0, duration: 0.5, ease: EASE.out }, at);
      tl.fromTo(
        word.outer,
        { color: PALETTE.textDim },
        { color: PALETTE.accent, duration: 0.08, ease: EASE.out },
        at,
      );
      tl.to(word.outer, { color: PALETTE.text, duration: 0.45, ease: EASE.inOut }, at + 0.16);
      wordIndex += 1;
    });
  });

  leave(tl, frame, scene.end - 0.4);
}

/**
 * A timeline strip along the bottom of the frame: one marker per word, lit once it has landed.
 * @param {CanvasRenderingContext2D} c
 * @param {number} t
 * @param {number} w
 * @param {readonly number[]} times
 */
function drawTicker(c, t, w, times) {
  const { from, to } = COPY.lyrics.ticker;
  const x0 = TICKER_INSET;
  const x1 = w - TICKER_INSET;
  line(c, x0, TICKER_Y, x1, TICKER_Y, PALETTE.lineStrong, 1, 1);
  const position = (/** @type {number} */ time) => x0 + (x1 - x0) * invLerp(from, to, time);
  times.forEach((time) => {
    const landed = t >= time;
    disc(c, position(time), TICKER_Y, landed ? 5.5 : 3.5, landed ? PALETTE.accent : PALETTE.textDim, landed ? 1 : 0.8);
  });
  const head = position(Math.min(Math.max(t, from), to));
  line(c, head, TICKER_Y - 14, head, TICKER_Y + 14, PALETTE.text, 0.8, 1.5);
}
