/** Assembles the film: one paused GSAP master timeline that every frame is a seek into. */

import { gsap } from 'gsap';

import manifest from '../../assets/audio/vo/manifest.json' with { type: 'json' };
import { CUES, DRUMS, SCENES, VIDEO, VOICEOVER } from '../config/video.config.js';
import { resolveCues } from '../core/cues.js';
import { hitTimes } from '../core/score.js';
import { resolveVoiceover } from '../core/voiceover.js';
import { createBackdrop } from './backdrop.js';
import { buildCaptions } from './captions.js';
import { buildChrome } from './chrome.js';
import { el } from './dom.js';
import { createLayerRegistry } from './layers.js';
import { buildAnalyze } from './scenes/analyze.js';
import { buildCamera } from './scenes/camera.js';
import { buildChoose } from './scenes/choose.js';
import { buildCta } from './scenes/cta.js';
import { buildEngines } from './scenes/engines.js';
import { buildGenre } from './scenes/genre.js';
import { buildHook } from './scenes/hook.js';
import { buildLab } from './scenes/lab.js';
import { buildLyrics } from './scenes/lyrics.js';
import { buildProblem } from './scenes/problem.js';
import { buildProduct } from './scenes/product.js';
import { buildQuality } from './scenes/quality.js';
import { buildSeed } from './scenes/seed.js';
import { buildUpload } from './scenes/upload.js';

/**
 * Everything a scene needs to place its content on the master timeline.
 * @typedef {object} SceneContext
 * @property {import('gsap').core.Timeline} tl Master timeline. Add tweens at absolute seconds.
 * @property {import('../config/video.config.js').SceneConfig} scene
 * @property {HTMLElement} root Scene container, hidden outside the scene window.
 * @property {Readonly<Record<string, number>>} cues Named moments in absolute seconds.
 * @property {(id: string) => import('../core/voiceover.js').ResolvedLine} line Voiceover line by id.
 * @property {ReturnType<typeof createLayerRegistry>} layers Canvas layers redrawn on every seek.
 * @property {readonly number[]} kicks Kick drum onset times.
 */

/** @type {Readonly<Record<string, (ctx: SceneContext) => void>>} */
const SCENE_BUILDERS = Object.freeze({
  hook: buildHook,
  problem: buildProblem,
  product: buildProduct,
  engines: buildEngines,
  upload: buildUpload,
  analyze: buildAnalyze,
  genre: buildGenre,
  lyrics: buildLyrics,
  camera: buildCamera,
  seed: buildSeed,
  choose: buildChoose,
  quality: buildQuality,
  lab: buildLab,
  cta: buildCta,
});

/** Seconds a scene root stays visible around its window, for entrances that start early. */
const VISIBLE_MARGIN = 0.05;

/**
 * @param {HTMLElement} stage
 * @returns {{ seek: (time: number) => void, duration: number }}
 */
export function buildFilm(stage) {
  gsap.ticker.lagSmoothing(0);
  const voiceover = resolveVoiceover(VOICEOVER.lines, manifest);
  const cues = resolveCues(CUES, voiceover);
  const kicks = hitTimes(DRUMS.kick, VIDEO.bpm, VIDEO.beatsPerBar);
  const layers = createLayerRegistry();
  const tl = gsap.timeline({ paused: true });

  createBackdrop(stage);
  const scenesLayer = el('div', 'layer', stage);

  for (const scene of SCENES) {
    const build = SCENE_BUILDERS[scene.id];
    if (!build) {
      continue;
    }
    const root = el('div', 'scene', scenesLayer);
    root.dataset['scene'] = scene.id;
    tl.set(root, { visibility: 'visible' }, Math.max(0, scene.start - VISIBLE_MARGIN));
    tl.set(root, { visibility: 'hidden' }, scene.end + VISIBLE_MARGIN);
    build({
      tl,
      scene,
      root,
      cues,
      kicks,
      layers,
      line: (id) => {
        const found = voiceover.find((candidate) => candidate.id === id);
        if (!found) {
          throw new Error(`Unknown voiceover line "${id}".`);
        }
        return found;
      },
    });
  }

  buildChrome(tl, stage, cues);
  buildCaptions(tl, stage, voiceover);
  // Pin the timeline length to the film so the last frame is always addressable.
  tl.set({}, {}, VIDEO.duration);

  return {
    duration: tl.duration(),
    seek(time) {
      tl.time(time);
      layers.render(time);
    },
  };
}
