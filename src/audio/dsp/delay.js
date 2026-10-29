/** Ping-pong delay: echoes alternate between the channels and darken as they fade. */

import { createStereo } from './buffer.js';

/**
 * @param {import('./buffer.js').Stereo} input Send bus.
 * @param {{ sampleRate: number, time: number, feedback: number, damping?: number }} options
 * @returns {import('./buffer.js').Stereo} Wet signal only.
 */
export function pingPongDelay(input, options) {
  const { sampleRate, time, feedback, damping = 0.45 } = options;
  const frames = input.l.length;
  const wet = createStereo(frames);
  const delayFrames = Math.round(time * sampleRate);
  let lowL = 0;
  let lowR = 0;
  for (let i = 0; i < frames; i += 1) {
    const echoL = i >= delayFrames ? (wet.l[i - delayFrames] ?? 0) : 0;
    const echoR = i >= delayFrames ? (wet.r[i - delayFrames] ?? 0) : 0;
    lowL = (1 - damping) * echoR + damping * lowL;
    lowR = (1 - damping) * echoL + damping * lowR;
    wet.l[i] = (input.l[i] ?? 0) + lowL * feedback;
    wet.r[i] = (input.r[i] ?? 0) + lowR * feedback;
  }
  // The first repeat should not include the dry hit, only what follows it.
  for (let i = 0; i < frames; i += 1) {
    wet.l[i] = (wet.l[i] ?? 0) - (input.l[i] ?? 0);
    wet.r[i] = (wet.r[i] ?? 0) - (input.r[i] ?? 0);
  }
  return wet;
}
