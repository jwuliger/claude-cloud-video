/** Beat map: turns the drum pattern config into absolute hit times and pulse envelopes. */

import { decay, round } from './math.js';
import { barSeconds, beatSeconds } from './timecode.js';

const STEPS_PER_BEAT = 4;

/**
 * @typedef {object} PatternSection
 * @property {number} from Seconds, inclusive.
 * @property {number} to Seconds, exclusive.
 * @property {readonly number[]} steps Sixteenth-note steps (0-15) that sound within each bar.
 */

/**
 * @param {readonly PatternSection[]} sections
 * @param {number} bpm
 * @param {number} beatsPerBar
 * @returns {number[]} Sorted hit times in seconds.
 */
export function hitTimes(sections, bpm, beatsPerBar) {
  const bar = barSeconds(bpm, beatsPerBar);
  const step = beatSeconds(bpm) / STEPS_PER_BEAT;
  /** @type {number[]} */
  const times = [];
  for (const section of sections) {
    const firstBar = Math.floor(section.from / bar);
    const lastBar = Math.ceil(section.to / bar);
    for (let barIndex = firstBar; barIndex <= lastBar; barIndex += 1) {
      for (const stepIndex of section.steps) {
        const time = round(barIndex * bar + stepIndex * step, 6);
        if (time >= section.from - 1e-9 && time < section.to - 1e-9) {
          times.push(time);
        }
      }
    }
  }
  return times.sort((a, b) => a - b);
}

/**
 * Index of the last hit at or before `time`, or -1 when none has happened yet.
 * @param {readonly number[]} hits Sorted ascending.
 * @param {number} time
 * @returns {number}
 */
export function lastHitIndex(hits, time) {
  let low = 0;
  let high = hits.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if ((hits[middle] ?? Infinity) <= time) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

/**
 * Pulse envelope: 1 at a hit, falling exponentially until the next one.
 * @param {readonly number[]} hits Sorted ascending.
 * @param {number} time
 * @param {number} timeConstant Seconds.
 * @returns {number}
 */
export function pulse(hits, time, timeConstant) {
  const index = lastHitIndex(hits, time);
  const hit = hits[index];
  return hit === undefined ? 0 : decay(time - hit, timeConstant);
}
