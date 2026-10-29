/** Scene schedule helpers: lookup, progress and validation. */

import { clamp01, invLerp } from './math.js';

/**
 * @typedef {object} SceneSpec
 * @property {string} id
 * @property {number} start Seconds.
 * @property {number} end Seconds.
 */

/**
 * @template {SceneSpec} T
 * @param {readonly T[]} scenes
 * @param {string} id
 * @returns {T}
 */
export function sceneById(scenes, id) {
  const scene = scenes.find((candidate) => candidate.id === id);
  if (!scene) {
    throw new Error(`Unknown scene "${id}".`);
  }
  return scene;
}

/**
 * @template {SceneSpec} T
 * @param {readonly T[]} scenes
 * @param {number} time
 * @returns {T | undefined} The scene covering `time`, if any.
 */
export function sceneAt(scenes, time) {
  return scenes.find((scene) => time >= scene.start && time < scene.end);
}

/**
 * @param {SceneSpec} scene
 * @param {number} time
 * @returns {number} 0 at the scene start and 1 at its end, clamped.
 */
export function sceneProgress(scene, time) {
  return clamp01(invLerp(scene.start, scene.end, time));
}

/**
 * Problems that would make the film glitch: gaps, overlaps, or running past the end.
 * @param {readonly SceneSpec[]} scenes
 * @param {number} duration
 * @returns {string[]} Human readable problems; empty when the schedule is sound.
 */
export function validateScenes(scenes, duration) {
  /** @type {string[]} */
  const problems = [];
  let cursor = 0;
  for (const scene of scenes) {
    if (Math.abs(scene.start - cursor) > 1e-9) {
      problems.push(`Scene "${scene.id}" starts at ${scene.start} but the previous one ended at ${cursor}.`);
    }
    if (scene.end <= scene.start) {
      problems.push(`Scene "${scene.id}" ends before it starts.`);
    }
    cursor = scene.end;
  }
  if (Math.abs(cursor - duration) > 1e-9) {
    problems.push(`Scenes end at ${cursor} but the film lasts ${duration}.`);
  }
  return problems;
}
