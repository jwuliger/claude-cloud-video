/** Sums narration, music and sound effects into one stereo programme, with ducking. */

import { AUDIO } from '../config/video.config.js';
import { addMono, addStereo, applyGainCurve, createStereo, dbToGain } from './dsp/buffer.js';
import { duckGain, followSpeech } from './ducking.js';

/**
 * @typedef {object} MixInputs
 * @property {number} sampleRate
 * @property {Float32Array} voice Processed narration, mono.
 * @property {import('./dsp/wav.js').Stereo} voiceRoom
 * @property {import('./dsp/wav.js').Stereo} music
 * @property {import('./dsp/wav.js').Stereo} sfx
 * @property {{ voice: number, music: number, sfx: number }} gainDb Per-stem trim in dB.
 */

/**
 * @param {MixInputs} inputs
 * @returns {import('./dsp/wav.js').Stereo}
 */
export function mixdown(inputs) {
  const { sampleRate, voice, voiceRoom, music, sfx, gainDb } = inputs;
  const speech = followSpeech(voice, {
    sampleRate,
    thresholdDb: -52,
    attack: AUDIO.duck.attack,
    release: AUDIO.duck.release,
  });
  const out = createStereo(voice.length);

  const musicBus = { l: Float32Array.from(music.l), r: Float32Array.from(music.r) };
  applyGainCurve(musicBus, duckGain(speech, AUDIO.duck.depthDb));
  addStereo(out, musicBus, dbToGain(gainDb.music));

  const sfxBus = { l: Float32Array.from(sfx.l), r: Float32Array.from(sfx.r) };
  applyGainCurve(sfxBus, duckGain(speech, AUDIO.duck.depthDb / 2));
  addStereo(out, sfxBus, dbToGain(gainDb.sfx));

  addMono(out, voice, 0, dbToGain(gainDb.voice), 0);
  addStereo(out, voiceRoom, dbToGain(gainDb.voice));
  return out;
}
