/**
 * Generates the voiceover WAV files and manifest from the script in the config.
 * Requires the one-time setup in scripts/tts/setup.sh (Python venv + Kokoro model files).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { VOICEOVER } from '../src/config/video.config.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const python = join(root, '.cache/venv/bin/python');
const modelDir = join(root, '.cache/models');
const outDir = join(root, 'assets/audio/vo');
const requestPath = join(root, '.cache/tts-request.json');

const request = {
  voice: VOICEOVER.voice,
  speed: VOICEOVER.speed,
  lang: VOICEOVER.lang,
  lines: VOICEOVER.lines.map(({ id, speak }) => ({ id, speak })),
};

mkdirSync(outDir, { recursive: true });
writeFileSync(requestPath, JSON.stringify(request));

const result = spawnSync(
  python,
  [join(root, 'scripts/tts/kokoro_synth.py'), requestPath, outDir, modelDir],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);
if (result.status !== 0) {
  process.stderr.write(result.stderr);
  throw new Error('Voiceover synthesis failed. Did you run npm run tts:setup?');
}

writeFileSync(join(outDir, 'manifest.json'), `${result.stdout.trim()}\n`);
process.stdout.write(`Wrote ${request.lines.length} lines to ${outDir}\n`);
