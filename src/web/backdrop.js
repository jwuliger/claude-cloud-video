/** Static backdrop: soft lift, faint dot grid and a dither so dark gradients never band. */

import { PALETTE, VIDEO } from '../config/video.config.js';
import { rgba } from '../core/color.js';
import { createRng } from '../core/rng.js';

const DOT_SPACING = 48;
const DOT_RADIUS = 0.8;
const DOT_ALPHA = 0.1;
/** Dither amplitude in 8-bit levels, applied to luminance only. */
const DITHER_LEVELS = 1.6;
const DITHER_SEED = 7;

/**
 * Paint the backdrop once into a canvas that fills the stage.
 * @param {HTMLElement} parent
 * @returns {HTMLCanvasElement}
 */
export function createBackdrop(parent) {
  const pixelRatio = window.devicePixelRatio || 1;
  const { layoutWidth: width, layoutHeight: height } = VIDEO;
  const canvas = document.createElement('canvas');
  canvas.className = 'layer';
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D is not available.');
  }
  ctx.scale(pixelRatio, pixelRatio);

  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, width, height);
  const lift = ctx.createRadialGradient(width / 2, height * 0.46, 0, width / 2, height * 0.46, 980);
  lift.addColorStop(0, PALETTE.bgLift);
  lift.addColorStop(1, PALETTE.bg);
  ctx.fillStyle = lift;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = rgba(PALETTE.text, DOT_ALPHA);
  for (let y = DOT_SPACING / 2; y < height; y += DOT_SPACING) {
    for (let x = DOT_SPACING / 2; x < width; x += DOT_SPACING) {
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  dither(ctx, canvas.width, canvas.height);
  parent.append(canvas);
  return canvas;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width Device pixels.
 * @param {number} height Device pixels.
 */
function dither(ctx, width, height) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const rng = createRng(DITHER_SEED);
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rng() - 0.5) * 2 * DITHER_LEVELS;
    data[i] = Math.round((data[i] ?? 0) + noise);
    data[i + 1] = Math.round((data[i + 1] ?? 0) + noise);
    data[i + 2] = Math.round((data[i + 2] ?? 0) + noise);
  }
  ctx.putImageData(image, 0, 0);
}
