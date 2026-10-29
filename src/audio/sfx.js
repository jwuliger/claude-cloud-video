/** Sound effects, synthesised from scratch. Every effect is peak-normalised, then mixed by dB. */

import { AUDIO } from '../config/video.config.js';
import { dbToGain, addMono, addStereo, createStereo, noteToHz } from './dsp/buffer.js';
import { filterInPlace } from './dsp/filters.js';
import { decayEnvelope, shape, sine, whiteNoise } from './dsp/osc.js';
import { reverb } from './dsp/reverb.js';
import { bell, frames, sweep } from './voices.js';

/**
 * @typedef {import('../config/video.config.js').SfxEvent} SfxEvent
 * @typedef {(event: SfxEvent, sampleRate: number, seed: number) => Float32Array} SoundMaker
 */

/**
 * @param {Float32Array} clip
 * @returns {Float32Array} The same clip scaled to a peak of 1.
 */
function normalize(clip) {
  let max = 0;
  for (const sample of clip) {
    max = Math.max(max, Math.abs(sample));
  }
  if (max > 0) {
    for (let i = 0; i < clip.length; i += 1) {
      clip[i] = (clip[i] ?? 0) / max;
    }
  }
  return clip;
}

/**
 * @param {Float32Array} clip
 * @param {number} sampleRate
 * @param {number} seconds
 * @returns {Float32Array} The clip with its last `seconds` faded out smoothly.
 */
function fadeTail(clip, sampleRate, seconds) {
  const count = Math.min(clip.length, Math.round(seconds * sampleRate));
  for (let i = 0; i < count; i += 1) {
    const index = clip.length - 1 - i;
    clip[index] = (clip[index] ?? 0) * (0.5 - 0.5 * Math.cos((Math.PI * i) / count));
  }
  return clip;
}

/** Reverse-cymbal style swell that peaks at its end. */
const swell = /** @type {SoundMaker} */ (event, sampleRate, seed) => {
  const duration = event.duration ?? 1.5;
  const clip = sweep({ sampleRate, seed, duration, from: 500, to: 7500, q: 0.9, curve: 1.2 });
  const length = clip.length;
  for (let i = 0; i < length; i += 1) {
    clip[i] = (clip[i] ?? 0) * (i / length) ** 2.4;
  }
  return fadeTail(normalize(clip), sampleRate, 0.02);
};

/** Rising noise with a tonal whine, for the lead-in to a hit. */
const riser = /** @type {SoundMaker} */ (event, sampleRate, seed) => {
  const duration = event.duration ?? 1.5;
  const length = frames(duration, sampleRate);
  const air = sweep({ sampleRate, seed, duration, from: 300, to: 8200, q: 1.2, curve: 1.4 });
  const whine = sine(length, (i) => 240 * 4 ** (i / length), sampleRate);
  const clip = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    clip[i] = ((air[i] ?? 0) * 0.9 + (whine[i] ?? 0) * 0.16) * (i / length) ** 1.8;
  }
  return fadeTail(normalize(clip), sampleRate, 0.03);
};

/** Airy pass-by: noise that sweeps up or down in pitch with a bell-shaped loudness. */
const whoosh = /** @type {SoundMaker} */ (event, sampleRate, seed) => {
  const duration = event.duration ?? 0.6;
  const down = event.direction === 'down';
  const clip = sweep({
    sampleRate,
    seed,
    duration,
    from: down ? 3400 : 450,
    to: down ? 450 : 3400,
    q: 0.9,
  });
  for (let i = 0; i < clip.length; i += 1) {
    clip[i] = (clip[i] ?? 0) * Math.sin((Math.PI * i) / clip.length) ** 2;
  }
  return normalize(clip);
};

/** Deep hit: a falling sub sine and a burst of filtered noise. */
const impact = /** @type {SoundMaker} */ (_event, sampleRate, seed) => {
  const length = frames(1.6, sampleRate);
  const boom = sine(length, (i) => 34 + 64 * Math.exp(-i / (0.09 * sampleRate)), sampleRate);
  shape(boom, decayEnvelope(length, 0.55, sampleRate, 0.002));
  const burst = whiteNoise(length, seed);
  filterInPlace(burst, 'lowpass', 2600, sampleRate);
  shape(burst, decayEnvelope(length, 0.12, sampleRate, 0.001));
  const clip = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    clip[i] = Math.tanh(((boom[i] ?? 0) * 1.1 + (burst[i] ?? 0) * 0.45) * 1.2);
  }
  return fadeTail(normalize(clip), sampleRate, 0.1);
};

/** A single pitched bell ping. */
const ping = /** @type {SoundMaker} */ (event, sampleRate) =>
  normalize(bell({ sampleRate, hz: noteToHz(event.note ?? 'C6'), duration: 1.5, shine: 0.8 }));

/** Tiny UI tick: a short pitched blip with a hint of click. */
const tick = /** @type {SoundMaker} */ (event, sampleRate, seed) => {
  const length = frames(0.09, sampleRate);
  const tone = sine(length, noteToHz(event.note ?? 'E6'), sampleRate);
  shape(tone, decayEnvelope(length, 0.017, sampleRate, 0.0006));
  const click = whiteNoise(length, seed);
  filterInPlace(click, 'highpass', 4000, sampleRate);
  shape(click, decayEnvelope(length, 0.002, sampleRate, 0.0002));
  for (let i = 0; i < length; i += 1) {
    tone[i] = (tone[i] ?? 0) + (click[i] ?? 0) * 0.25;
  }
  return normalize(tone);
};

/** Soft low thump, like a card landing on a surface. */
const thud = /** @type {SoundMaker} */ (_event, sampleRate, seed) => {
  const length = frames(0.35, sampleRate);
  const body = sine(length, (i) => 54 + 70 * Math.exp(-i / (0.025 * sampleRate)), sampleRate);
  shape(body, decayEnvelope(length, 0.09, sampleRate, 0.001));
  const knock = whiteNoise(length, seed);
  filterInPlace(knock, 'lowpass', 900, sampleRate);
  shape(knock, decayEnvelope(length, 0.012, sampleRate, 0.0005));
  for (let i = 0; i < length; i += 1) {
    body[i] = Math.tanh(((body[i] ?? 0) + (knock[i] ?? 0) * 0.5) * 1.3);
  }
  return normalize(body);
};

/** Rounded UI pop: a quick upward glide. */
const pop = /** @type {SoundMaker} */ (_event, sampleRate) => {
  const length = frames(0.16, sampleRate);
  const tone = sine(length, (i) => 640 + 520 * (1 - Math.exp(-i / (0.02 * sampleRate))), sampleRate);
  shape(tone, decayEnvelope(length, 0.04, sampleRate, 0.004));
  return normalize(tone);
};

/** A short rising bell flourish. */
const chime = /** @type {SoundMaker} */ (event, sampleRate) => {
  const notes = event.notes ?? ['C5', 'G5', 'C6'];
  const spacing = 0.12;
  const length = frames(1.9 + spacing * notes.length, sampleRate);
  const clip = new Float32Array(length);
  notes.forEach((name, index) => {
    const note = bell({ sampleRate, hz: noteToHz(name), duration: 1.8, shine: 0.85 });
    const start = frames(index * spacing, sampleRate);
    note.forEach((value, i) => {
      clip[start + i] = (clip[start + i] ?? 0) + value * (0.75 + 0.25 * (index / notes.length));
    });
  });
  return normalize(clip);
};

/** @type {Readonly<Record<string, { make: SoundMaker, reverb: number }>>} */
const SOUNDS = Object.freeze({
  swell: { make: swell, reverb: 0.2 },
  riser: { make: riser, reverb: 0.2 },
  whoosh: { make: whoosh, reverb: 0.25 },
  impact: { make: impact, reverb: 0.5 },
  ping: { make: ping, reverb: 0.55 },
  tick: { make: tick, reverb: 0.2 },
  thud: { make: thud, reverb: 0.15 },
  pop: { make: pop, reverb: 0.25 },
  chime: { make: chime, reverb: 0.6 },
});

/**
 * @param {import('./sfx-plan.js').TimedSfx[]} plan
 * @param {{ sampleRate: number, duration: number }} options
 * @returns {import('./dsp/wav.js').Stereo}
 */
export function renderSfx(plan, options) {
  const { sampleRate, duration } = options;
  const total = Math.round(duration * sampleRate);
  const dry = createStereo(total);
  const send = createStereo(total);
  plan.forEach(({ time, event }, index) => {
    const sound = SOUNDS[event.sound];
    if (!sound) {
      throw new Error(`Unknown sound "${event.sound}".`);
    }
    const clip = sound.make(event, sampleRate, 5000 + index);
    const gain = dbToGain(event.gain);
    addMono(dry, clip, time * sampleRate, gain, event.pan ?? 0);
    addMono(send, clip, time * sampleRate, gain * sound.reverb, event.pan ?? 0);
  });
  const wet = reverb(send, { sampleRate, rt60: AUDIO.musicReverb.rt60 * 0.7, damping: 0.45, preDelay: 0.015 });
  addStereo(dry, wet);
  return dry;
}
