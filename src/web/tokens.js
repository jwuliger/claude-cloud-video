/** Publishes the config tokens as CSS variables and loads the single typeface. */

import { LAYOUT, PALETTE, TYPE, VIDEO } from '../config/video.config.js';

/**
 * @param {string} name camelCase key
 * @returns {string} kebab-case
 */
function kebab(name) {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * @param {HTMLElement} root
 */
export function applyTokens(root) {
  /** @type {Record<string, string>} */
  const variables = {
    '--font': `"${TYPE.family}"`,
    '--layout-width': `${VIDEO.layoutWidth}px`,
    '--layout-height': `${VIDEO.layoutHeight}px`,
    '--caption-bottom': `${LAYOUT.captionBottom}px`,
  };
  for (const [name, value] of Object.entries(PALETTE)) {
    variables[`--${kebab(name)}`] = value;
  }
  for (const [name, value] of Object.entries(TYPE.size)) {
    variables[`--size-${name}`] = `${value}px`;
  }
  for (const [name, value] of Object.entries(TYPE.weight)) {
    variables[`--weight-${name}`] = String(value);
  }
  for (const [name, value] of Object.entries(TYPE.tracking)) {
    variables[`--tracking-${name}`] = value;
  }
  for (const [name, value] of Object.entries(variables)) {
    document.documentElement.style.setProperty(name, value);
  }
  root.dataset['tokens'] = 'ready';
}

/**
 * Load the variable font and wait until it is usable, so text never renders in a fallback.
 * @returns {Promise<void>}
 */
export async function loadFont() {
  const face = new FontFace(TYPE.family, `url(${TYPE.file})`, { weight: '100 900' });
  document.fonts.add(await face.load());
  await document.fonts.ready;
}
