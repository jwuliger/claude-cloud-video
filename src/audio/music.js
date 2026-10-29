/** The soundtrack: a minimal 120 BPM groove built from the score in the config. */

import { AUDIO, DRUMS, SCORE, VIDEO } from '../config/video.config.js';
import { smoothstep } from '../core/math.js';
import { hitTimes } from '../core/score.js';
import { barSeconds, beatSeconds } from '../core/timecode.js';
import { addMono, addStereo, applyGainCurve, createStereo, noteToHz } from './dsp/buffer.js';
import { pingPongDelay } from './dsp/delay.js';
import { compress, duckCurve, softClip } from './dsp/dynamics.js';
import { filterInPlace } from './dsp/filters.js';
import { sine, swellEnvelope } from './dsp/osc.js';
import { reverb } from './dsp/reverb.js';
import { bass, bell, clap, hat, kick, padNote, pluck, shaker } from './voices.js';

const STEP = beatSeconds(VIDEO.bpm) / 4;
const BAR = barSeconds(VIDEO.bpm, VIDEO.beatsPerBar);
const EIGHTH_PATTERN = [0, 2, 3, 2, 4, 3, 2, 1];
const SIXTEENTH_PATTERN = [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 5, 4, 3, 2, 1];
const PAD_PANS = [-0.5, -0.25, 0, 0.25, 0.5];

/**
 * @param {number} time
 * @returns {typeof SCORE.sections[number]}
 */
function sectionAt(time) {
  const found = SCORE.sections.find((section) => time >= section.from && time < section.to);
  return found ?? SCORE.sections[SCORE.sections.length - 1] ?? SCORE.sections[0];
}

/**
 * @param {number} bar Zero-based bar index.
 * @returns {typeof SCORE.voicings[keyof typeof SCORE.voicings]}
 */
function voicingForBar(bar) {
  const overrides = /** @type {Record<number, string>} */ (SCORE.overrides);
  const name = overrides[bar] ?? SCORE.loop[bar % SCORE.loop.length] ?? 'Am9';
  const voicing = /** @type {Record<string, typeof SCORE.voicings.Am9>} */ (SCORE.voicings)[name];
  if (!voicing) {
    throw new Error(`No voicing for chord "${name}".`);
  }
  return voicing;
}

/**
 * Everything that sounds, plus the sends that go through shared effects.
 * @param {number} frames
 */
function createBuses(frames) {
  return {
    drums: createStereo(frames),
    bass: createStereo(frames),
    pad: createStereo(frames),
    arp: createStereo(frames),
    bells: createStereo(frames),
    drone: createStereo(frames),
    reverbSend: createStereo(frames),
    delaySend: createStereo(frames),
  };
}

/**
 * @typedef {ReturnType<typeof createBuses>} Buses
 * @typedef {{ sampleRate: number, frames: number, buses: Buses }} Rig
 */

/**
 * Place a clip on a bus and feed the effect sends.
 * @param {Rig} rig
 * @param {keyof Buses} bus
 * @param {Float32Array} clip
 * @param {number} time Seconds.
 * @param {{ gain: number, pan?: number, reverb?: number, delay?: number }} mix
 */
function place(rig, bus, clip, time, mix) {
  const start = time * rig.sampleRate;
  const pan = mix.pan ?? 0;
  addMono(rig.buses[bus], clip, start, mix.gain, pan);
  if (mix.reverb) {
    addMono(rig.buses.reverbSend, clip, start, mix.gain * mix.reverb, pan);
  }
  if (mix.delay) {
    addMono(rig.buses.delaySend, clip, start, mix.gain * mix.delay, pan);
  }
}

/** @param {Rig} rig */
function renderDrums(rig) {
  const { sampleRate } = rig;
  const hits = (/** @type {string} */ name) => hitTimes(DRUMS[name] ?? [], VIDEO.bpm, VIDEO.beatsPerBar);
  hits('kick').forEach((time, index) => {
    const heartbeat = time < 3;
    place(rig, 'drums', kick({ sampleRate, seed: index, weight: heartbeat ? 0.8 : 1 }), time, {
      gain: heartbeat ? 0.55 : 0.68,
    });
  });
  hits('hat').forEach((time, index) => {
    const step = Math.round((time % BAR) / STEP);
    const open = step === 14 && Math.floor(time / BAR) % 2 === 1;
    place(rig, 'drums', hat({ sampleRate, seed: 100 + index, open }), time, {
      gain: open ? 0.16 : 0.12,
      pan: 0.25,
      reverb: 0.12,
    });
  });
  hits('shaker').forEach((time, index) => {
    place(rig, 'drums', shaker({ sampleRate, seed: 400 + index }), time, {
      gain: index % 2 === 0 ? 0.075 : 0.05,
      pan: index % 2 === 0 ? -0.3 : 0.3,
    });
  });
  hits('clap').forEach((time, index) => {
    place(rig, 'drums', clap({ sampleRate, seed: 700 + index }), time, {
      gain: 0.26,
      reverb: 0.4,
    });
  });
}

/** @param {Rig} rig */
function renderBass(rig) {
  const { sampleRate } = rig;
  for (let bar = 0; bar * BAR < VIDEO.duration; bar += 1) {
    const barStart = bar * BAR;
    const section = sectionAt(barStart);
    if (section.bass === 'none') {
      continue;
    }
    const hz = noteToHz(voicingForBar(bar).root);
    const notes =
      section.bass === 'pulse'
        ? [
            [0, 1, 0.46],
            [6, 1, 0.2],
            [10, 2, 0.18],
          ]
        : [
            [0, 1, 1.0],
            [8, 1, 0.9],
          ];
    for (const [step = 0, multiple = 1, duration = 0.2] of notes) {
      place(rig, 'bass', bass({ sampleRate, hz: hz * multiple, duration }), barStart + step * STEP, {
        gain: section.bass === 'long' ? 0.46 : 0.5,
      });
    }
  }
}

/** @param {Rig} rig */
function renderPad(rig) {
  const { sampleRate } = rig;
  for (let bar = 0; bar * BAR < VIDEO.duration; bar += 1) {
    const barStart = bar * BAR;
    const section = sectionAt(barStart);
    if (section.pad === 0) {
      continue;
    }
    const last = bar === Math.floor(VIDEO.duration / BAR) - 1;
    voicingForBar(bar).pad.forEach((note, index) => {
      const clip = padNote({
        sampleRate,
        hz: noteToHz(note),
        duration: last ? 4.2 : BAR + 1.1,
        attack: last ? 0.5 : 0.75,
        release: last ? 2.2 : 1.1,
        brightness: 0.55 + 0.5 * section.pad,
      });
      place(rig, 'pad', clip, barStart - 0.05, {
        gain: 0.075 * section.pad,
        pan: PAD_PANS[index % PAD_PANS.length] ?? 0,
        reverb: 0.5,
      });
    });
  }
}

/** Low drone under the hook and the problem, so the silence before the drop has weight. */
function renderDrone(/** @type {Rig} */ rig) {
  const { sampleRate } = rig;
  const length = Math.round(8.4 * sampleRate);
  const clip = new Float32Array(length);
  const fundamental = sine(length, noteToHz('A1'), sampleRate);
  const fifth = sine(length, noteToHz('E2'), sampleRate);
  const octave = sine(length, noteToHz('A2'), sampleRate);
  for (let i = 0; i < length; i += 1) {
    clip[i] = (fundamental[i] ?? 0) * 0.7 + (fifth[i] ?? 0) * 0.28 + (octave[i] ?? 0) * 0.18;
  }
  const envelope = swellEnvelope(length, 1.8, 1.2, sampleRate);
  for (let i = 0; i < length; i += 1) {
    clip[i] = (clip[i] ?? 0) * (envelope[i] ?? 0);
  }
  filterInPlace(clip, 'lowpass', 420, sampleRate);
  place(rig, 'drone', clip, 0, { gain: 0.4, reverb: 0.3 });
}

/**
 * How late the problem scene's plucks arrive at a given time.
 * @param {number} time
 * @returns {number} Seconds.
 */
function drift(time) {
  return SCORE.driftSeconds * smoothstep(SCORE.driftFrom, SCORE.driftTo, time);
}

/** @param {Rig} rig */
function renderArp(rig) {
  const { sampleRate } = rig;
  for (let bar = 0; bar * BAR < VIDEO.duration; bar += 1) {
    const barStart = bar * BAR;
    const section = sectionAt(barStart);
    if (section.arp === 'none') {
      continue;
    }
    const notes = voicingForBar(bar).arp;
    const sixteenth = section.arp === 'sixteenth';
    const stepsPerNote = sixteenth ? 1 : 2;
    for (let step = 0; step < 16; step += stepsPerNote) {
      const time = barStart + step * STEP;
      if (sectionAt(time).arp !== section.arp) {
        continue;
      }
      const slot = step / stepsPerNote;
      const pattern = sixteenth ? SIXTEENTH_PATTERN : EIGHTH_PATTERN;
      const noteName =
        section.arp === 'drift' ? notes[slot % 2 === 0 ? 3 : 2] : notes[pattern[slot % pattern.length] ?? 0];
      const accent = step % 4 === 0 ? 1 : step % 2 === 0 ? 0.78 : 0.55;
      const brightness = 0.55 + 0.6 * (time / VIDEO.duration);
      const clip = pluck({
        sampleRate,
        hz: noteToHz(noteName ?? 'A4'),
        duration: sixteenth ? 0.28 : 0.45,
        brightness,
      });
      if (section.arp === 'drift') {
        place(rig, 'arp', clip, time + drift(time), { gain: 0.14 * accent, pan: slot % 2 ? 0.3 : -0.3, reverb: 0.2 });
      } else {
        place(rig, 'arp', clip, time, {
          gain: (sixteenth ? 0.13 : 0.17) * accent,
          pan: slot % 2 ? 0.35 : -0.35,
          reverb: 0.25,
          delay: 0.42,
        });
      }
    }
  }
}

/** @param {Rig} rig */
function renderBells(rig) {
  const { sampleRate } = rig;
  for (let bar = 0; bar * BAR < VIDEO.duration; bar += 1) {
    const barStart = bar * BAR;
    const section = sectionAt(barStart);
    if (!section.bells) {
      continue;
    }
    const notes = voicingForBar(bar).bell;
    const steps = section.arp === 'none' ? [8, 14] : bar % 2 === 0 ? [10] : [10, 14];
    steps.forEach((step, index) => {
      const time = barStart + step * STEP;
      if (!sectionAt(time).bells) {
        return;
      }
      const name = notes[(bar + index) % notes.length] ?? 'C6';
      place(rig, 'bells', bell({ sampleRate, hz: noteToHz(name), duration: 1.9, shine: 0.9 }), time, {
        gain: section.arp === 'none' ? 0.17 : 0.12,
        pan: (bar + index) % 2 ? 0.4 : -0.4,
        reverb: 0.55,
        delay: 0.4,
      });
    });
  }
}

/**
 * Render the soundtrack.
 * @param {{ sampleRate: number, duration: number }} options
 * @returns {import('./dsp/wav.js').Stereo}
 */
export function renderMusic(options) {
  const { sampleRate, duration } = options;
  const frames = Math.round(duration * sampleRate);
  const rig = { sampleRate, frames, buses: createBuses(frames) };
  renderDrums(rig);
  renderBass(rig);
  renderPad(rig);
  renderDrone(rig);
  renderArp(rig);
  renderBells(rig);

  const kicks = hitTimes(DRUMS['kick'] ?? [], VIDEO.bpm, VIDEO.beatsPerBar);
  const duck = (/** @type {number} */ depth, /** @type {number} */ release) =>
    duckCurve(frames, kicks, { sampleRate, depth, release });
  applyGainCurve(rig.buses.bass, duck(0.5, 0.16));
  applyGainCurve(rig.buses.pad, duck(0.32, 0.2));
  applyGainCurve(rig.buses.arp, duck(0.22, 0.14));
  applyGainCurve(rig.buses.bells, duck(0.12, 0.14));
  for (const channel of [rig.buses.pad.l, rig.buses.pad.r]) {
    filterInPlace(channel, 'highpass', 170, sampleRate, { q: 0.6 });
  }

  const wetReverb = reverb(rig.buses.reverbSend, {
    sampleRate,
    rt60: AUDIO.musicReverb.rt60,
    damping: AUDIO.musicReverb.damping,
    preDelay: 0.025,
  });
  const wetDelay = pingPongDelay(rig.buses.delaySend, {
    sampleRate,
    time: AUDIO.delayTime,
    feedback: 0.38,
  });

  const master = createStereo(frames);
  for (const bus of [rig.buses.drums, rig.buses.bass, rig.buses.pad, rig.buses.arp, rig.buses.bells, rig.buses.drone]) {
    addStereo(master, bus);
  }
  addStereo(master, wetReverb, 0.85);
  addStereo(master, wetDelay, 0.7);

  for (const channel of [master.l, master.r]) {
    filterInPlace(channel, 'highpass', 40, sampleRate);
    filterInPlace(channel, 'lowshelf', 90, sampleRate, { gainDb: -2 });
    filterInPlace(channel, 'peaking', 380, sampleRate, { q: 0.8, gainDb: -2 });
    filterInPlace(channel, 'peaking', 2600, sampleRate, { q: 0.8, gainDb: -2.5 });
  }
  compress(master, { sampleRate, thresholdDb: -18, ratio: 2, attack: 0.02, release: 0.18, makeupDb: 2 });
  softClip(master, 1.15);
  applyEndFades(master, sampleRate);
  return master;
}

/**
 * A short fade-in and the closing fade-out, so the track never starts or ends with a click.
 * @param {import('./dsp/wav.js').Stereo} bus
 * @param {number} sampleRate
 */
function applyEndFades(bus, sampleRate) {
  const fadeIn = Math.round(0.02 * sampleRate);
  const outStart = Math.round(AUDIO.musicFadeOut.from * sampleRate);
  const outEnd = Math.round(AUDIO.musicFadeOut.to * sampleRate);
  const dipStart = Math.round(7.86 * sampleRate);
  const dipEnd = Math.round(8 * sampleRate);
  for (let i = 0; i < bus.l.length; i += 1) {
    let gain = Math.min(1, i / fadeIn);
    if (i > outStart) {
      gain *= Math.max(0, 1 - (i - outStart) / (outEnd - outStart)) ** 1.5;
    }
    if (i >= dipStart && i < dipEnd) {
      gain *= 0.12;
    }
    bus.l[i] = (bus.l[i] ?? 0) * gain;
    bus.r[i] = (bus.r[i] ?? 0) * gain;
  }
}
