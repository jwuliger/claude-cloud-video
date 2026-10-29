/** Tiny DOM helpers so scene code stays declarative. */

/**
 * @param {string} tag
 * @param {string} className Space separated classes.
 * @param {HTMLElement} parent
 * @param {string} [text]
 * @returns {HTMLElement}
 */
export function el(tag, className, parent, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) {
    node.textContent = text;
  }
  parent.append(node);
  return node;
}

/**
 * Position an absolutely placed element in layout pixels.
 * @param {HTMLElement} node
 * @param {{ x?: number, y?: number, w?: number, h?: number }} box
 * @returns {HTMLElement}
 */
export function place(node, box) {
  const { x, y, w, h } = box;
  node.style.position = 'absolute';
  if (x !== undefined) node.style.left = `${x}px`;
  if (y !== undefined) node.style.top = `${y}px`;
  if (w !== undefined) node.style.width = `${w}px`;
  if (h !== undefined) node.style.height = `${h}px`;
  return node;
}

/**
 * An empty clipping mask for any content that should slide up into view.
 * @param {HTMLElement} parent
 * @param {string} [className]
 * @returns {{ outer: HTMLElement, inner: HTMLElement }}
 */
export function maskedContent(parent, className = '') {
  const outer = el('span', `mask ${className}`.trim(), parent);
  const inner = el('span', 'inner', outer);
  return { outer, inner };
}

/**
 * One word inside a clipping mask, ready for a slide-up reveal.
 * @param {HTMLElement} parent
 * @param {string} text
 * @param {string} [className]
 * @returns {{ outer: HTMLElement, inner: HTMLElement }}
 */
export function maskedWord(parent, text, className = '') {
  const masked = maskedContent(parent, className);
  masked.inner.textContent = text;
  return masked;
}

/**
 * A row of masked words.
 * @param {HTMLElement} parent
 * @param {readonly string[]} words
 * @param {{ className?: string, gap?: string, accentIndexes?: readonly number[] }} [options]
 * @returns {{ row: HTMLElement, inners: HTMLElement[] }}
 */
export function wordRow(parent, words, options = {}) {
  const { className = '', gap = '0.26em', accentIndexes = [] } = options;
  const row = el('div', className, parent);
  row.style.display = 'flex';
  row.style.justifyContent = 'center';
  row.style.columnGap = gap;
  const inners = words.map(
    (word, index) => maskedWord(row, word, accentIndexes.includes(index) ? 'accent' : '').inner,
  );
  return { row, inners };
}

/**
 * A small interface label: a dim index number beside tracked capitals.
 * @param {HTMLElement} parent
 * @param {string} index Shown as given, for example "01".
 * @param {string} text
 * @returns {{ node: HTMLElement, index: HTMLElement, text: HTMLElement }}
 */
export function tagLabel(parent, index, text) {
  const node = el('div', 'tag', parent);
  const indexNode = el('span', 'idx', node, index);
  const textNode = el('span', 'txt', node, text);
  return { node, index: indexNode, text: textNode };
}

/**
 * Colour role of a piece of pseudo-code.
 * @param {string} token
 * @param {string} following Source text after the token.
 * @param {readonly string[]} inputs
 * @returns {string} CSS class for the span.
 */
function codeRole(token, following, inputs) {
  if (!/^[A-Za-z_]+$/.test(token)) {
    return 'op';
  }
  if (following.startsWith('(')) {
    return 'fn';
  }
  return inputs.includes(token) ? 'input' : '';
}

/**
 * One line of pseudo-code coloured by role: operators dim, functions bright, inputs in the accent.
 * @param {HTMLElement} parent
 * @param {string} source For example "pulse = decay(beat)".
 * @param {readonly string[]} inputs Names that come from the song or the seed.
 * @returns {HTMLElement}
 */
export function codeLine(parent, source, inputs) {
  const line = el('div', 'code', parent);
  for (const match of source.matchAll(/[A-Za-z_]+|[^A-Za-z_]+/g)) {
    const token = match[0];
    el('span', codeRole(token, source.slice(match.index + token.length), inputs), line, token);
  }
  return line;
}
