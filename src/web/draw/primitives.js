/** Canvas drawing primitives shared by the scenes. Coordinates are layout pixels. */

import { rgba } from '../../core/color.js';

/**
 * Pixel-exact 1px line: offsets by half a pixel so the stroke covers whole device pixels.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {string} color Hex colour.
 * @param {number} [alpha]
 * @param {number} [width] Layout pixels.
 */
export function line(ctx, x1, y1, x2, y2, color, alpha = 1, width = 1) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = width;
  ctx.strokeStyle = rgba(color, alpha);
  ctx.stroke();
}

/**
 * Stroke a polyline given as a flat [x0, y0, x1, y1, ...] array.
 * @param {CanvasRenderingContext2D} ctx
 * @param {readonly number[]} points
 * @param {string} color Hex colour.
 * @param {number} [alpha]
 * @param {number} [width]
 */
export function polyline(ctx, points, color, alpha = 1, width = 1) {
  if (points.length < 4) {
    return;
  }
  ctx.beginPath();
  ctx.moveTo(points[0] ?? 0, points[1] ?? 0);
  for (let i = 2; i < points.length; i += 2) {
    ctx.lineTo(points[i] ?? 0, points[i + 1] ?? 0);
  }
  ctx.lineWidth = width;
  ctx.strokeStyle = rgba(color, alpha);
  ctx.stroke();
}

/**
 * Trace a rounded rectangle path without drawing it.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} radius
 */
export function roundedRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Filled circle.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @param {string} color Hex colour.
 * @param {number} [alpha]
 */
export function disc(ctx, x, y, radius, color, alpha = 1) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = rgba(color, alpha);
  ctx.fill();
}

/**
 * Stroked circle.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @param {string} color Hex colour.
 * @param {number} [alpha]
 * @param {number} [width]
 */
export function circle(ctx, x, y, radius, color, alpha = 1, width = 1) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.lineWidth = width;
  ctx.strokeStyle = rgba(color, alpha);
  ctx.stroke();
}
