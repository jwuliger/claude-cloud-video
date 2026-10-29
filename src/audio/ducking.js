/** Makes room for the narrator: follows the speech and turns everything else down. */

import { dbToGain, gainToDb } from './dsp/buffer.js';

const WINDOW_SECONDS = 0.02;

/**
 * Smoothed 0-1 curve that is 1 while someone is speaking.
 * @param {Float32Array} voice Mono narration.
 * @param {{ sampleRate: number, thresholdDb: number, attack: number, release: number }} options
 * @returns {Float32Array}
 */
export function followSpeech(voice, options) {
  const { sampleRate, thresholdDb, attack, release } = options;
  const window = Math.round(WINDOW_SECONDS * sampleRate);
  const curve = new Float32Array(voice.length);
  const attackCoefficient = Math.exp(-1 / (attack * sampleRate));
  const releaseCoefficient = Math.exp(-1 / (release * sampleRate));
  let level = 0;
  let squares = 0;
  for (let i = 0; i < voice.length; i += 1) {
    const incoming = voice[i] ?? 0;
    const outgoing = i >= window ? (voice[i - window] ?? 0) : 0;
    squares += incoming * incoming - outgoing * outgoing;
    const rmsDb = gainToDb(Math.sqrt(Math.max(0, squares) / window));
    const target = rmsDb > thresholdDb ? 1 : 0;
    const coefficient = target > level ? attackCoefficient : releaseCoefficient;
    level = coefficient * level + (1 - coefficient) * target;
    curve[i] = level;
  }
  return curve;
}

/**
 * @param {Float32Array} speech Output of followSpeech.
 * @param {number} depthDb How far to turn things down while speech is at full level.
 * @returns {Float32Array} Linear gain curve.
 */
export function duckGain(speech, depthDb) {
  const floor = dbToGain(-depthDb);
  const gain = new Float32Array(speech.length);
  for (let i = 0; i < speech.length; i += 1) {
    gain[i] = 1 - (1 - floor) * (speech[i] ?? 0);
  }
  return gain;
}
