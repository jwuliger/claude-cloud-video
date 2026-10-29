/** Buffers, gain and pitch helpers for the offline synth. */

/**
 * @typedef {import('./wav.js').Stereo} Stereo
 */

const A4_HZ = 440;
const A4_MIDI = 69;
const NOTE_INDEX = Object.freeze({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 });

/**
 * @param {number} frames
 * @returns {Stereo}
 */
export function createStereo(frames) {
  return { l: new Float32Array(frames), r: new Float32Array(frames) };
}

/** @param {number} db @returns {number} Linear gain. */
export function dbToGain(db) {
  return 10 ** (db / 20);
}

/** @param {number} gain @returns {number} Decibels. */
export function gainToDb(gain) {
  return 20 * Math.log10(Math.max(gain, 1e-9));
}

/**
 * @param {number} midi
 * @returns {number} Frequency in Hz.
 */
export function midiToHz(midi) {
  return A4_HZ * 2 ** ((midi - A4_MIDI) / 12);
}

/**
 * @param {string} name e.g. "A3", "C#5", "Bb2".
 * @returns {number} MIDI note number.
 */
export function noteToMidi(name) {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!match) {
    throw new Error(`Bad note name "${name}".`);
  }
  const [, letter = 'C', accidental = '', octave = '4'] = match;
  const base = /** @type {Record<string, number>} */ (NOTE_INDEX)[letter] ?? 0;
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return 12 * (Number(octave) + 1) + base + shift;
}

/** @param {string} name @returns {number} Frequency in Hz. */
export function noteToHz(name) {
  return midiToHz(noteToMidi(name));
}

/**
 * Add a mono clip into a stereo bus at a sample offset with equal-power panning.
 * @param {Stereo} bus
 * @param {Float32Array} clip
 * @param {number} startSample May be fractional; it is rounded.
 * @param {number} [gain] Linear.
 * @param {number} [pan] -1 left, 0 centre, 1 right.
 */
export function addMono(bus, clip, startSample, gain = 1, pan = 0) {
  const angle = ((pan + 1) * Math.PI) / 4;
  const left = Math.cos(angle) * gain;
  const right = Math.sin(angle) * gain;
  const start = Math.round(startSample);
  const end = Math.min(bus.l.length, start + clip.length);
  for (let i = Math.max(0, start); i < end; i += 1) {
    const sample = clip[i - start] ?? 0;
    bus.l[i] = (bus.l[i] ?? 0) + sample * left;
    bus.r[i] = (bus.r[i] ?? 0) + sample * right;
  }
}

/**
 * Add one stereo bus into another.
 * @param {Stereo} target
 * @param {Stereo} source
 * @param {number} [gain] Linear.
 */
export function addStereo(target, source, gain = 1) {
  const length = Math.min(target.l.length, source.l.length);
  for (let i = 0; i < length; i += 1) {
    target.l[i] = (target.l[i] ?? 0) + (source.l[i] ?? 0) * gain;
    target.r[i] = (target.r[i] ?? 0) + (source.r[i] ?? 0) * gain;
  }
}

/**
 * Multiply a stereo bus by a per-sample gain curve.
 * @param {Stereo} bus
 * @param {Float32Array} curve
 */
export function applyGainCurve(bus, curve) {
  for (let i = 0; i < bus.l.length; i += 1) {
    const g = curve[i] ?? 1;
    bus.l[i] = (bus.l[i] ?? 0) * g;
    bus.r[i] = (bus.r[i] ?? 0) * g;
  }
}

/**
 * Peak level of a stereo bus.
 * @param {Stereo} bus
 * @returns {number} Linear peak.
 */
export function peak(bus) {
  let max = 0;
  for (let i = 0; i < bus.l.length; i += 1) {
    max = Math.max(max, Math.abs(bus.l[i] ?? 0), Math.abs(bus.r[i] ?? 0));
  }
  return max;
}
