/** 0:17 Upload. A song lands in the drop zone and the whole track is read ahead of time. */

import { COPY, PALETTE } from '../../config/video.config.js';
import { cue } from '../../core/cues.js';
import { clamp01 } from '../../core/math.js';
import { el, maskedWord, place } from '../dom.js';
import { line } from '../draw/primitives.js';
import { songBars } from '../draw/song.js';
import { DURATION, EASE, leave, maskIn, riseIn } from '../motion.js';
import { rgba } from '../../core/color.js';

const ZONE = { x: 120, y: 360, w: 1680, h: 300 };
const BAR_COUNT = 150;
const BAR_PADDING = 48;
/** Where the file chip starts, relative to its resting place in the header. */
const CHIP_DROP = { x: 640, y: 150 };
const HEADER_Y = ZONE.y - 78;

/**
 * @param {import('../film.js').SceneContext} ctx
 */
export function buildUpload(ctx) {
  const { tl, scene, root, cues, layers } = ctx;
  const dropAt = cue(cues, 'upload.drop');
  const panelAt = cue(cues, 'upload.panel');
  const scanAt = cue(cues, 'upload.scan');
  const doneAt = cue(cues, 'upload.done');
  const state = { bars: 0, scan: 0 };

  const zone = el('div', 'card', root);
  place(zone, ZONE);
  zone.style.borderStyle = 'dashed';
  zone.style.background = 'transparent';
  const zoneLabel = maskedWord(zone, COPY.upload.zone, 'title dim');
  place(zoneLabel.outer, { x: ZONE.w / 2 - 110, y: ZONE.h / 2 - 28 });
  riseIn(tl, zone, scene.start + 0.1, { y: 20 });
  maskIn(tl, zoneLabel.inner, scene.start + 0.35);

  const panel = el('div', 'card', root);
  place(panel, ZONE);
  riseIn(tl, panel, panelAt, { y: 0, duration: DURATION.short });
  tl.to([zone], { opacity: 0, duration: DURATION.short, ease: EASE.in }, panelAt);

  const chip = el('div', 'chip', root);
  place(chip, { x: ZONE.x, y: HEADER_Y });
  const icon = el('span', 'dot', chip);
  icon.style.position = 'relative';
  icon.style.width = '8px';
  icon.style.height = '8px';
  el('span', 'strong', chip, COPY.upload.file);
  el('span', 'dim', chip, COPY.upload.length);
  tl.fromTo(
    chip,
    { opacity: 0, x: CHIP_DROP.x, y: CHIP_DROP.y - 220 },
    { opacity: 1, x: CHIP_DROP.x, y: CHIP_DROP.y, duration: 0.7, ease: EASE.out },
    dropAt,
  );
  tl.to(chip, { x: 0, y: 0, duration: 0.8, ease: EASE.inOut }, panelAt);

  const status = el('div', 'label', root);
  place(status, { x: ZONE.x + ZONE.w - 520, y: HEADER_Y + 11, w: 520 });
  status.style.textAlign = 'right';
  const reading = el('span', '', status, COPY.upload.reading);
  const percent = el('span', 'strong', status, ' 0%');
  const complete = el('div', 'label', root, COPY.upload.done);
  complete.style.color = PALETTE.text;
  place(complete, { x: ZONE.x + ZONE.w - 520, y: HEADER_Y + 11, w: 520 });
  complete.style.textAlign = 'right';
  riseIn(tl, status, scanAt - 0.3, { y: 8, duration: DURATION.short });
  tl.to(status, { opacity: 0, duration: 0.2 }, doneAt);
  riseIn(tl, complete, doneAt, { y: 8, duration: DURATION.short });
  reading.style.marginRight = '4px';

  tl.fromTo(state, { bars: 0 }, { bars: 1, duration: 1, ease: EASE.out }, panelAt + 0.15);
  tl.fromTo(state, { scan: 0 }, { scan: 1, duration: doneAt - scanAt - 0.1, ease: EASE.linear }, scanAt);

  layers.add({
    parent: panel,
    width: ZONE.w - 2,
    height: ZONE.h - 2,
    start: scene.start,
    end: scene.end,
    draw: (c) => drawTrack(c, state),
  });
  layers.hook({
    start: scanAt,
    end: doneAt,
    run: () => {
      percent.textContent = ` ${Math.round(state.scan * 100)}%`;
    },
  });

  leave(tl, [zone, panel, chip, complete], scene.end - 0.4);
}

const BARS = songBars(BAR_COUNT);

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ bars: number, scan: number }} state
 */
function drawTrack(ctx, state) {
  const width = ZONE.w - 2;
  const middle = (ZONE.h - 2) / 2;
  const pitch = (width - BAR_PADDING * 2) / (BAR_COUNT - 1);
  const scanX = BAR_PADDING + (width - BAR_PADDING * 2) * state.scan;
  BARS.forEach((value, i) => {
    const rise = EASE.out(clamp01(state.bars * 1.8 - (i / BAR_COUNT) * 0.8));
    const half = value * 96 * rise;
    const x = BAR_PADDING + i * pitch;
    const read = x <= scanX && state.scan > 0;
    const peak = value > 0.8 && read;
    const color = peak ? PALETTE.accent : read ? PALETTE.text : PALETTE.textDim;
    line(ctx, x, middle - half, x, middle + half, color, read ? 0.95 : 0.55, 2.2);
  });
  line(ctx, BAR_PADDING, middle, width - BAR_PADDING, middle, PALETTE.line, 1, 1);
  if (state.scan > 0 && state.scan < 1) {
    const glow = ctx.createLinearGradient(scanX - 120, 0, scanX, 0);
    glow.addColorStop(0, rgba(PALETTE.accent, 0));
    glow.addColorStop(1, rgba(PALETTE.accent, 0.16));
    ctx.fillStyle = glow;
    ctx.fillRect(scanX - 120, 14, 120, ZONE.h - 30);
    line(ctx, scanX, 14, scanX, ZONE.h - 16, PALETTE.accent, 1, 2);
  }
}
