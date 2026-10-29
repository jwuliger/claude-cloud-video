/** Named moments on the timeline, shared by the visuals and the sound design. */

import { wordStart } from './voiceover.js';

/**
 * A cue is either a fixed time or the start of a spoken word, plus an optional offset.
 * @typedef {object} CueSpec
 * @property {number} [at] Fixed time in seconds.
 * @property {string} [line] Voiceover line id.
 * @property {string} [word] Word inside that line.
 * @property {number} [nth] Occurrence of the word, zero-based.
 * @property {number} [offset] Seconds added to the resolved time.
 */

/**
 * @param {CueSpec} spec
 * @param {readonly import('./voiceover.js').ResolvedLine[]} lines
 * @returns {number}
 */
function resolveCue(spec, lines) {
  const offset = spec.offset ?? 0;
  if (spec.at !== undefined) {
    return spec.at + offset;
  }
  if (spec.line !== undefined && spec.word !== undefined) {
    return wordStart(lines, spec.line, spec.word, spec.nth ?? 0) + offset;
  }
  throw new Error(`Cue needs either "at" or both "line" and "word": ${JSON.stringify(spec)}`);
}

/**
 * @param {Readonly<Record<string, CueSpec>>} specs
 * @param {readonly import('./voiceover.js').ResolvedLine[]} lines
 * @returns {Record<string, number>} Absolute seconds by cue name.
 */
export function resolveCues(specs, lines) {
  return Object.fromEntries(
    Object.entries(specs).map(([name, spec]) => [name, resolveCue(spec, lines)]),
  );
}

/**
 * Look a cue up by name and fail loudly on typos.
 * @param {Readonly<Record<string, number>>} cues
 * @param {string} name
 * @returns {number}
 */
export function cue(cues, name) {
  const time = cues[name];
  if (time === undefined) {
    throw new Error(`Unknown cue "${name}".`);
  }
  return time;
}
