/** Frame, second and beat conversions. The film is rendered frame by frame from these. */

import { round } from './math.js';

/**
 * @param {number} frame Zero-based frame index.
 * @param {number} fps
 * @returns {number} Seconds at the start of the frame.
 */
export function frameToSeconds(frame, fps) {
  return frame / fps;
}

/**
 * @param {number} seconds
 * @param {number} fps
 * @returns {number} Nearest frame index.
 */
export function secondsToFrame(seconds, fps) {
  return Math.round(seconds * fps);
}

/**
 * @param {number} duration Seconds.
 * @param {number} fps
 * @returns {number} Number of frames needed to cover the duration.
 */
export function totalFrames(duration, fps) {
  return Math.round(duration * fps);
}

/**
 * @param {number} bpm
 * @returns {number} Seconds per beat.
 */
export function beatSeconds(bpm) {
  return 60 / bpm;
}

/**
 * @param {number} bpm
 * @param {number} beatsPerBar
 * @returns {number} Seconds per bar.
 */
export function barSeconds(bpm, beatsPerBar) {
  return beatSeconds(bpm) * beatsPerBar;
}

/**
 * @param {number} seconds
 * @param {number} bpm
 * @returns {number} Fractional beat position.
 */
export function secondsToBeats(seconds, bpm) {
  return seconds / beatSeconds(bpm);
}

/**
 * @param {number} beats
 * @param {number} bpm
 * @returns {number}
 */
export function beatsToSeconds(beats, bpm) {
  return beats * beatSeconds(bpm);
}

/**
 * Time of the closest beat on or before `seconds`.
 * @param {number} seconds
 * @param {number} bpm
 * @returns {number}
 */
export function previousBeat(seconds, bpm) {
  return beatsToSeconds(Math.floor(round(secondsToBeats(seconds, bpm), 6)), bpm);
}

/**
 * Whether a time sits on the beat grid, within a millisecond.
 * @param {number} seconds
 * @param {number} bpm
 * @returns {boolean}
 */
export function isOnBeat(seconds, bpm) {
  const beats = secondsToBeats(seconds, bpm);
  return Math.abs(beats - Math.round(beats)) * beatSeconds(bpm) < 0.001;
}

/**
 * @param {number} seconds
 * @returns {string} `m:ss.mmm` for logs and error messages.
 */
export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = (seconds - minutes * 60).toFixed(3).padStart(6, '0');
  return `${minutes}:${rest}`;
}
