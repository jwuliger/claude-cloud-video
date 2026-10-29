/** 0:12 Engines. Song in, rules and math in the middle, video out. Not generative AI video. */

import { COPY, PALETTE, VIDEO } from '../../config/video.config.js';
import { cue } from '../../core/cues.js';
import { clamp01, fract } from '../../core/math.js';
import { pulse } from '../../core/score.js';
import { el, maskedWord, place } from '../dom.js';
import { drawLook } from '../draw/looks.js';
import { circle, disc, line } from '../draw/primitives.js';
import { songBars } from '../draw/song.js';
import { DURATION, EASE, leave, maskIn, riseIn } from '../motion.js';

const NODE_Y = 350;
const NODE_HEIGHT = 290;
const NODES = Object.freeze({
  song: { x: 120, w: 440 },
  engine: { x: 700, w: 520 },
  video: { x: 1360, w: 440 },
});
const LINK_Y = NODE_Y + NODE_HEIGHT / 2;
const BAR_COUNT = 34;

/**
 * @param {import('../film.js').SceneContext} ctx
 */
export function buildEngines(ctx) {
  const { tl, scene, root, cues, layers, kicks } = ctx;
  const head = cue(cues, 'engines.headline');
  const rulesAt = cue(cues, 'engines.rules');
  const notAt = cue(cues, 'engines.not');
  const state = { links: 0 };

  const headline = maskedWord(root, COPY.engines.headline, 'headline nowrap');
  place(headline.outer, { x: NODES.song.x, y: 140 });
  maskIn(tl, headline.inner, head);

  /** @type {Record<string, HTMLElement>} */
  const cards = {};
  for (const [id, box] of Object.entries(NODES)) {
    const card = el('div', 'card', root);
    place(card, { x: box.x, y: NODE_Y, w: box.w, h: NODE_HEIGHT });
    const title = /** @type {Record<string, string>} */ (COPY.engines.nodes)[id] ?? id;
    const label = el('div', 'label', card, title);
    place(label, { x: 24, y: 22 });
    cards[id] = card;
  }
  const cardList = Object.values(cards);
  riseIn(tl, cardList, head + 0.35, { stagger: 0.14, duration: DURATION.base });

  addNodeVisuals(ctx, cards, scene);

  const engine = cards['engine'];
  if (engine) {
    COPY.engines.rules.forEach((rule, index) => {
      const { outer, inner } = maskedWord(engine, rule, 'body strong nowrap');
      place(outer, { x: 32, y: 92 + index * 56 });
      maskIn(tl, inner, rulesAt + index * 0.28);
    });
    tl.fromTo(
      engine,
      { borderColor: PALETTE.lineStrong },
      { borderColor: PALETTE.accent, duration: DURATION.base, ease: EASE.out },
      rulesAt,
    );
  }

  const row = el('div', 'layer', root);
  place(row, { y: 720 });
  row.style.display = 'flex';
  row.style.justifyContent = 'center';
  row.style.alignItems = 'center';
  row.style.columnGap = '20px';
  row.style.height = '44px';
  const chip = el('div', 'chip', row, COPY.engines.rejected);
  chip.style.position = 'relative';
  const strike = el('div', 'hairline', chip);
  strike.style.background = PALETTE.accent;
  strike.style.height = '2px';
  strike.style.left = '14px';
  strike.style.right = '14px';
  strike.style.top = '19px';
  strike.style.transformOrigin = '0 50%';
  riseIn(tl, row, notAt, { y: 16, duration: DURATION.short });
  tl.fromTo(strike, { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: EASE.inOut }, notAt + 0.4);
  tl.to(chip, { color: PALETTE.textDim, duration: DURATION.short }, notAt + 0.7);

  tl.fromTo(state, { links: 0 }, { links: 1, duration: 1.1, ease: EASE.out }, head + 0.9);

  layers.add({
    parent: root,
    width: VIDEO.layoutWidth,
    height: VIDEO.layoutHeight,
    start: scene.start,
    end: scene.end,
    draw: (ctx2d, t) => drawLinks(ctx2d, t, state.links, kicks),
  });

  leave(tl, [headline.outer, ...cardList, row], scene.end - 0.4);
}

/**
 * Live content inside the song and video cards.
 * @param {import('../film.js').SceneContext} ctx
 * @param {Record<string, HTMLElement>} cards
 * @param {import('../../config/video.config.js').SceneConfig} scene
 */
function addNodeVisuals(ctx, cards, scene) {
  const { layers, kicks } = ctx;
  const bars = songBars(BAR_COUNT);
  const song = cards['song'];
  const video = cards['video'];
  if (song) {
    layers.add({
      parent: song,
      width: NODES.song.w - 2,
      height: NODE_HEIGHT - 2,
      start: scene.start,
      end: scene.end,
      draw: (c, t) => {
        const pitch = (NODES.song.w - 80) / BAR_COUNT;
        bars.forEach((height, i) => {
          const live = 0.82 + 0.18 * Math.sin(t * 2.1 + i * 0.7);
          const h = height * live * 130;
          line(c, 40 + i * pitch, 160 - h / 2, 40 + i * pitch, 160 + h / 2, PALETTE.text, 0.75, 2);
        });
      },
    });
  }
  if (video) {
    layers.add({
      parent: video,
      width: NODES.video.w - 2,
      height: NODE_HEIGHT - 2,
      start: scene.start,
      end: scene.end,
      draw: (c, t) =>
        drawLook(c, 'contours', {
          w: NODES.video.w - 2,
          h: NODE_HEIGHT - 2,
          t,
          seed: VIDEO.seed,
          pulse: pulse(kicks, t, 0.25),
          floor: PALETTE.surface,
          detail: 0.8,
        }),
    });
  }
}

/**
 * Connectors between the cards, with data dots flowing along them.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t
 * @param {number} links 0-1 draw progress.
 * @param {readonly number[]} kicks
 */
function drawLinks(ctx, t, links, kicks) {
  const segments = [
    [NODES.song.x + NODES.song.w, NODES.engine.x],
    [NODES.engine.x + NODES.engine.w, NODES.video.x],
  ];
  const beat = pulse(kicks, t, 0.2);
  segments.forEach(([from = 0, to = 0], index) => {
    const reach = from + (to - from) * links;
    line(ctx, from, LINK_Y, reach, LINK_Y, PALETTE.lineStrong, 1, 1);
    circle(ctx, to, LINK_Y, 4, PALETTE.lineStrong, links);
    if (links < 0.98) {
      return;
    }
    for (let k = 0; k < 2; k += 1) {
      const phase = fract(t * 0.55 + k * 0.5 + index * 0.25);
      const x = from + (to - from) * phase;
      const fade = Math.sin(clamp01(phase) * Math.PI);
      disc(ctx, x, LINK_Y, 3.2 + beat, PALETTE.accent, fade);
      line(ctx, x - 26 * fade, LINK_Y, x, LINK_Y, PALETTE.accent, 0.35 * fade, 1);
    }
  });
}
