/** The illustrative song shown in the film: a deterministic envelope and the analysis built on it. */

import { VIDEO } from '../../config/video.config.js';
import { clamp01, smoothstep } from '../../core/math.js';
import { noise1 } from '../../core/noise.js';
import { hash2 } from '../../core/rng.js';

/** Loudness by song position: quiet intro, verse, build, chorus, outro. */
const SECTIONS = [
  [0, 0.28],
  [0.12, 0.52],
  [0.38, 0.42],
  [0.5, 0.95],
  [0.78, 0.6],
];

/**
 * @param {number} u 0-1 position in the song.
 * @returns {number} Smoothed section loudness.
 */
function sectionLevel(u) {
  let level = SECTIONS[0]?.[1] ?? 0;
  for (let i = 1; i < SECTIONS.length; i += 1) {
    const [start = 0, value = 0] = SECTIONS[i] ?? [];
    level += (value - level) * smoothstep(start - 0.03, start + 0.03, u);
  }
  return level;
}

/**
 * Bar heights for a waveform thumbnail.
 * @param {number} count
 * @returns {number[]} Values in [0.06, 1].
 */
export function songBars(count) {
  return Array.from({ length: count }, (_, i) => {
    const u = i / (count - 1);
    const texture =
      0.4 + 0.6 * Math.abs(noise1(i * 0.9, VIDEO.seed)) + 0.15 * hash2(i, 1, VIDEO.seed);
    return clamp01(0.06 + sectionLevel(u) * texture);
  });
}
