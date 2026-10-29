/**
 * One command from source to finished film: audio, frames, encode, verify.
 *
 *   npm run render                    CPU rendering, works anywhere
 *   npm run render -- --gpu           use this machine's GPU (needs: npx playwright install chromium)
 *   npm run render -- --gpu --angle metal --workers 3
 *
 * Extra flags go to the frame renderer. Delete build/frames to start from scratch.
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import { buildAudio } from './build-audio.js';
import { ROOT } from './lib/server.js';

/**
 * @param {string} script
 * @param {readonly string[]} args
 */
function run(script, args = []) {
  const result = spawnSync('node', [join(ROOT, 'scripts', script), ...args], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${script} failed.`);
  }
}

const passthrough = process.argv.slice(2);
const audio = buildAudio();
process.stdout.write(`Audio ${audio.built ? 'built' : 'up to date'}.\n`);
run('render-frames.js', passthrough);
if (!passthrough.includes('--range') && !passthrough.includes('--scale')) {
  run('encode.js');
  run('verify-output.js');
}
