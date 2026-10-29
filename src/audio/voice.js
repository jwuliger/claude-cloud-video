/** Places the voiceover clips on the timeline and gives them a clean broadcast-style tone. */

import { AUDIO } from '../config/video.config.js';
import { dbToGain, addMono, createStereo } from './dsp/buffer.js';
import { compress } from './dsp/dynamics.js';
import { filterInPlace } from './dsp/filters.js';
import { reverb } from './dsp/reverb.js';

/**
 * @param {readonly { at: number, samples: Float32Array }[]} clips Decoded narration at the mix rate.
 * @param {{ sampleRate: number, duration: number }} options
 * @returns {{ dry: Float32Array, wet: import('./dsp/wav.js').Stereo }}
 *   `dry` is the processed narration; `wet` is a small room around it.
 */
export function renderVoice(clips, options) {
  const { sampleRate, duration } = options;
  const total = Math.round(duration * sampleRate);
  const dry = new Float32Array(total);
  for (const clip of clips) {
    const start = Math.round(clip.at * sampleRate);
    clip.samples.forEach((value, i) => {
      if (start + i < total) {
        dry[start + i] = (dry[start + i] ?? 0) + value;
      }
    });
  }

  const eq = AUDIO.voiceEq;
  filterInPlace(dry, 'highpass', eq.highpassHz, sampleRate);
  filterInPlace(dry, 'peaking', eq.presenceHz, sampleRate, { q: 0.9, gainDb: eq.presenceDb });
  filterInPlace(dry, 'peaking', 220, sampleRate, { q: 0.9, gainDb: -1.5 });
  filterInPlace(dry, 'peaking', eq.sibilanceHz, sampleRate, { q: 1.2, gainDb: eq.sibilanceDb });
  // Two cascaded low-passes make a steep 4th-order roll-off above the natural range of speech.
  filterInPlace(dry, 'lowpass', eq.lowpassHz, sampleRate);
  filterInPlace(dry, 'lowpass', eq.lowpassHz, sampleRate);

  const level = { l: Float32Array.from(dry), r: Float32Array.from(dry) };
  compress(level, {
    sampleRate,
    thresholdDb: -24,
    ratio: 2.6,
    attack: 0.006,
    release: 0.09,
    makeupDb: 3,
  });
  const processed = level.l;

  const send = createStereo(total);
  addMono(send, processed, 0, dbToGain(AUDIO.voiceRoom.wetDb), 0);
  const wet = reverb(send, {
    sampleRate,
    rt60: AUDIO.voiceRoom.rt60,
    damping: 0.55,
    preDelay: 0.012,
    size: 0.8,
  });
  return { dry: processed, wet };
}
