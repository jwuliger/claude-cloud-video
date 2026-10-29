import { createHash } from 'node:crypto';

import { PNG } from 'pngjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PALETTE, SCENES, VIDEO } from '../src/config/video.config.js';
import { hexToRgb } from '../src/core/color.js';
import { captureFrame, launchBrowser, openFilm } from '../scripts/lib/browser.js';
import { startServer } from '../scripts/lib/server.js';

const BACKGROUND = hexToRgb(PALETTE.bg);
const ACCENT = hexToRgb(PALETTE.accent);
const CONTENT_THRESHOLD = 40;

/**
 * @param {Buffer} png
 * @returns {{ width: number, height: number, content: number, bright: number, accent: number }}
 *   Fractions of pixels that differ from the backdrop, are near-white text, and are accent coloured.
 */
function measure(png) {
  const image = PNG.sync.read(png);
  const total = image.width * image.height;
  let content = 0;
  let bright = 0;
  let accent = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    const [r = 0, g = 0, b = 0] = [image.data[i], image.data[i + 1], image.data[i + 2]];
    const distance =
      Math.abs(r - BACKGROUND[0]) + Math.abs(g - BACKGROUND[1]) + Math.abs(b - BACKGROUND[2]);
    content += distance > CONTENT_THRESHOLD ? 1 : 0;
    bright += r > 200 && g > 200 && b > 190 ? 1 : 0;
    accent +=
      Math.abs(r - ACCENT[0]) + Math.abs(g - ACCENT[1]) + Math.abs(b - ACCENT[2]) < 90 ? 1 : 0;
  }
  return {
    width: image.width,
    height: image.height,
    content: content / total,
    bright: bright / total,
    accent: accent / total,
  };
}

/** @param {Buffer} png */
const fingerprint = (png) => createHash('sha256').update(png).digest('hex');

describe('rendered frames', () => {
  /** @type {Awaited<ReturnType<typeof startServer>>} */
  let server;
  /** @type {Awaited<ReturnType<typeof launchBrowser>>} */
  let browser;
  /** @type {import('playwright-core').Page} */
  let page;

  beforeAll(async () => {
    server = await startServer();
    browser = await launchBrowser();
    page = await openFilm(browser, server.url, 1);
  });

  afterAll(async () => {
    await browser.close();
    await server.close();
  });

  it('builds a timeline as long as the film, with the typeface loaded', async () => {
    const facts = await page.evaluate(() => ({
      duration: /** @type {any} */ (window).film.duration,
      fontReady: document.fonts.check('500 20px Geist'),
    }));
    expect(facts.duration).toBe(VIDEO.duration);
    expect(facts.fontReady).toBe(true);
  });

  it('is never blank: every scene shows content, readable text and the accent colour', async () => {
    for (const scene of SCENES) {
      const time = scene.start + (scene.end - scene.start) * 0.72;
      const stats = measure(await captureFrame(page, time));
      expect(stats.content, `${scene.id} content at ${time}s`).toBeGreaterThan(0.004);
      expect(stats.bright, `${scene.id} text at ${time}s`).toBeGreaterThan(0.0002);
      expect(stats.accent, `${scene.id} accent at ${time}s`).toBeGreaterThan(0.00002);
    }
  });

  it('renders the same pixels for the same time, however the playhead got there', async () => {
    const first = fingerprint(await captureFrame(page, 33.4));
    await captureFrame(page, 52.9);
    await captureFrame(page, 3.2);
    const second = fingerprint(await captureFrame(page, 33.4));
    expect(second).toBe(first);
  });

  it('changes from one moment to the next', async () => {
    const a = fingerprint(await captureFrame(page, 22.9));
    const b = fingerprint(await captureFrame(page, 23.4));
    expect(a).not.toBe(b);
  });

  it('renders a full 4K frame at the delivery resolution', async () => {
    const fullPage = await openFilm(browser, server.url, VIDEO.width / VIDEO.layoutWidth);
    const stats = measure(await captureFrame(fullPage, 54.9));
    expect(stats.width).toBe(VIDEO.width);
    expect(stats.height).toBe(VIDEO.height);
    expect(stats.accent).toBeGreaterThan(0.0001);
    await fullPage.close();
  });
});
