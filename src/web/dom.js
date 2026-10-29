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
 * One word inside a clipping mask, ready for a slide-up reveal.
 * @param {HTMLElement} parent
 * @param {string} text
 * @param {string} [className]
 * @returns {{ outer: HTMLElement, inner: HTMLElement }}
 */
export function maskedWord(parent, text, className = '') {
  const outer = el('span', `mask ${className}`.trim(), parent);
  const inner = el('span', 'inner', outer, text);
  return { outer, inner };
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
