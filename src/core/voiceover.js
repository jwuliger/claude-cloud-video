/** Combines the scripted voiceover lines with the measured TTS manifest into absolute times. */

import { round } from './math.js';

/**
 * @typedef {object} ManifestWord
 * @property {string} text
 * @property {number} start Seconds from the start of the clip.
 * @property {number} end
 */

/**
 * @typedef {object} ManifestLine
 * @property {string} file
 * @property {number} duration Seconds.
 * @property {ManifestWord[]} words
 */

/**
 * @typedef {object} Manifest
 * @property {Record<string, ManifestLine>} lines
 */

/**
 * @typedef {object} ScriptLine
 * @property {string} id
 * @property {string} speak
 * @property {string} caption
 * @property {number} at Start on the master timeline.
 * @property {number[]} [captionAlign] For each caption word, the index of the spoken word it follows.
 */

/**
 * @typedef {object} TimedWord
 * @property {string} text As spoken.
 * @property {string} key Lower-case text without punctuation, used for lookups.
 * @property {number} start Absolute seconds.
 * @property {number} end
 */

/**
 * @typedef {object} ResolvedLine
 * @property {string} id
 * @property {string} file
 * @property {string} caption
 * @property {number} at
 * @property {number} duration
 * @property {number} end
 * @property {TimedWord[]} words
 * @property {number[]} captionAlign
 */

/**
 * @param {string} text
 * @returns {string} Lower-case letters and digits only.
 */
export function wordKey(text) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * @param {readonly ScriptLine[]} script
 * @param {Manifest} manifest
 * @returns {ResolvedLine[]}
 */
export function resolveVoiceover(script, manifest) {
  return script.map((line) => {
    const clip = manifest.lines[line.id];
    if (!clip) {
      throw new Error(`Voiceover line "${line.id}" is missing from the manifest. Run npm run tts.`);
    }
    const words = clip.words.map((word) => ({
      text: word.text,
      key: wordKey(word.text),
      start: round(line.at + word.start),
      end: round(line.at + word.end),
    }));
    const captionAlign = line.captionAlign ?? words.map((_, index) => index);
    return {
      id: line.id,
      file: clip.file,
      caption: line.caption,
      at: line.at,
      duration: clip.duration,
      end: round(line.at + clip.duration),
      words,
      captionAlign,
    };
  });
}

/**
 * Start time of a spoken word.
 * @param {readonly ResolvedLine[]} lines
 * @param {string} lineId
 * @param {string} word Matched ignoring case and punctuation.
 * @param {number} [nth] Which occurrence, zero-based.
 * @returns {number}
 */
export function wordStart(lines, lineId, word, nth = 0) {
  const line = lines.find((candidate) => candidate.id === lineId);
  if (!line) {
    throw new Error(`Unknown voiceover line "${lineId}".`);
  }
  const matches = line.words.filter((candidate) => candidate.key === wordKey(word));
  const found = matches[nth];
  if (!found) {
    throw new Error(`Word "${word}" (#${nth}) not found in line "${lineId}".`);
  }
  return found.start;
}

/**
 * @typedef {object} CaptionWord
 * @property {string} text As displayed.
 * @property {number} start When the matching spoken word starts.
 */

/**
 * @typedef {object} CaptionChunk
 * @property {string} lineId
 * @property {CaptionWord[]} words
 * @property {number} start First spoken word of the chunk.
 * @property {number} end Last spoken word of the chunk.
 */

/**
 * Split a line's caption into sentences, each timed from the words it follows.
 * @param {ResolvedLine} line
 * @returns {CaptionChunk[]}
 */
export function captionChunks(line) {
  const shown = line.caption.split(/\s+/);
  /** @type {CaptionChunk[]} */
  const chunks = [];
  /** @type {CaptionWord[]} */
  let current = [];
  /** @type {number[]} */
  let spokenIndexes = [];
  const flush = () => {
    if (current.length === 0) {
      return;
    }
    const first = line.words[spokenIndexes[0] ?? 0];
    const last = line.words[spokenIndexes[spokenIndexes.length - 1] ?? 0];
    chunks.push({
      lineId: line.id,
      words: current,
      start: first?.start ?? line.at,
      end: last?.end ?? line.end,
    });
    current = [];
    spokenIndexes = [];
  };
  shown.forEach((text, index) => {
    const spokenIndex = line.captionAlign[index] ?? index;
    current.push({ text, start: line.words[spokenIndex]?.start ?? line.at });
    spokenIndexes.push(spokenIndex);
    if (/[.!?]$/.test(text)) {
      flush();
    }
  });
  flush();
  return chunks;
}
