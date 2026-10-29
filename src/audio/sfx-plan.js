/** Turns the configured sound-effect list into timed events using the shared cue times. */

import { cue } from '../core/cues.js';

/**
 * @typedef {object} TimedSfx
 * @property {number} time Seconds on the master timeline.
 * @property {import('../config/video.config.js').SfxEvent} event
 */

/**
 * @param {readonly import('../config/video.config.js').SfxEvent[]} events
 * @param {Readonly<Record<string, number>>} cues
 * @param {readonly { id: string, start: number }[]} scenes
 * @returns {TimedSfx[]} Sorted by time.
 */
export function planSfx(events, cues, scenes) {
  /** @type {TimedSfx[]} */
  const timed = [];
  for (const event of events) {
    const offset = event.offset ?? 0;
    if (event.scenes) {
      for (const id of event.scenes) {
        const scene = scenes.find((candidate) => candidate.id === id);
        if (!scene) {
          throw new Error(`SFX refers to unknown scene "${id}".`);
        }
        timed.push({ time: scene.start + offset, event });
      }
      continue;
    }
    if (event.at === undefined) {
      throw new Error(`SFX event needs "at" or "scenes": ${JSON.stringify(event)}`);
    }
    const base = typeof event.at === 'number' ? event.at : cue(cues, event.at);
    timed.push({ time: base + offset, event });
  }
  return timed.sort((a, b) => a.time - b.time);
}
