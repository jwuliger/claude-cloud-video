/** Launches Chromium configured for pixel-exact, repeatable frame capture. */
import { chromium } from 'playwright-core';

import { VIDEO } from '../../src/config/video.config.js';

const BASE_ARGS = Object.freeze([
  '--font-render-hinting=none',
  '--disable-lcd-text',
  '--force-color-profile=srgb',
  '--run-all-compositor-stages-before-draw',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--hide-scrollbars',
]);

const GPU_ARGS = Object.freeze([
  '--ignore-gpu-blocklist',
  '--enable-gpu-rasterization',
  '--enable-zero-copy',
]);

/**
 * @typedef {object} BrowserOptions
 * @property {boolean} [gpu] Use the machine's GPU. Needs a full Chromium (npx playwright install chromium).
 * @property {string} [angle] ANGLE backend for the GPU: d3d11, metal, vulkan or gl.
 */

/**
 * @param {BrowserOptions} [options]
 */
export function launchBrowser(options = {}) {
  const { gpu = false, angle } = options;
  const args = [...BASE_ARGS];
  if (gpu) {
    args.push(...GPU_ARGS);
    if (angle) {
      args.push(`--use-angle=${angle}`);
    }
  }
  return chromium.launch({ args, ...(gpu ? { channel: 'chromium' } : {}) });
}

/**
 * Open the film page and wait until the timeline is built.
 * @param {import('playwright-core').Browser} browser
 * @param {string} baseUrl
 * @param {number} [scale] Device scale factor. 2 renders 1920x1080 layout as 3840x2160.
 * @returns {Promise<import('playwright-core').Page>}
 */
export async function openFilm(browser, baseUrl, scale = VIDEO.width / VIDEO.layoutWidth) {
  const page = await browser.newPage({
    viewport: { width: VIDEO.layoutWidth, height: VIDEO.layoutHeight },
    deviceScaleFactor: scale,
  });
  page.on('pageerror', (error) => {
    throw error;
  });
  await page.goto(`${baseUrl}/src/web/index.html`);
  await page.waitForFunction(
    () =>
      document.documentElement.dataset['ready'] === 'true' ||
      document.documentElement.dataset['error'],
    undefined,
    { timeout: 60_000 },
  );
  const failure = await page.evaluate(() => document.documentElement.dataset['error']);
  if (failure) {
    throw new Error(`Film failed to build: ${failure}`);
  }
  return page;
}

/**
 * Seek to a time and capture a PNG.
 * @param {import('playwright-core').Page} page
 * @param {number} time Seconds.
 * @returns {Promise<Buffer>}
 */
export async function captureFrame(page, time) {
  await page.evaluate((t) => /** @type {any} */ (window).film.seek(t), time);
  return page.screenshot({ type: 'png', caret: 'hide' });
}
