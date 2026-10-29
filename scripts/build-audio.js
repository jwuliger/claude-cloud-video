/**
 * Builds the soundtrack, sound effects and narration, mixes them, and masters the result.
 *
 *   node scripts/build-audio.js [--force]
 *
 * Output: build/audio/master.wav (24-bit, 48 kHz) and build/audio/report.json.
 * Stems are cached by a hash of the config and audio source, so reruns are instant.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import manifest from '../assets/audio/vo/manifest.json' with { type: 'json' };
import { AUDIO, CUES, SCENES, SFX, VIDEO, VOICEOVER } from '../src/config/video.config.js';
import { resolveCues } from '../src/core/cues.js';
import { resolveVoiceover } from '../src/core/voiceover.js';
import { writeStereoWav } from '../src/audio/dsp/wav.js';
import { mixdown } from '../src/audio/mixdown.js';
import { renderMusic } from '../src/audio/music.js';
import { planSfx } from '../src/audio/sfx-plan.js';
import { renderSfx } from '../src/audio/sfx.js';
import { renderVoice } from '../src/audio/voice.js';
import { decodeMono, ffmpegStderr, measureLoudness } from './lib/ffmpeg.js';
import { ROOT } from './lib/server.js';

export const AUDIO_DIR = join(ROOT, 'build/audio');
export const MASTER_PATH = join(AUDIO_DIR, 'master.wav');
const REPORT_PATH = join(AUDIO_DIR, 'report.json');

/**
 * @param {string} directory
 * @returns {string[]} All files below the directory, sorted.
 */
function listFiles(directory) {
  return readdirSync(directory)
    .flatMap((name) => {
      const path = join(directory, name);
      return statSync(path).isDirectory() ? listFiles(path) : [path];
    })
    .sort();
}

/** @returns {string} Hash of everything that influences the audio. */
function sourceHash() {
  const hash = createHash('sha256');
  const inputs = [
    ...listFiles(join(ROOT, 'src/audio')),
    ...listFiles(join(ROOT, 'src/core')),
    ...listFiles(join(ROOT, 'assets/audio/vo')),
    join(ROOT, 'src/config/video.config.js'),
    fileURLToPath(import.meta.url),
  ];
  for (const path of inputs) {
    hash.update(relative(ROOT, path));
    hash.update(readFileSync(path));
  }
  return hash.digest('hex');
}

/**
 * Two-pass loudness normalisation with a true-peak ceiling.
 * @param {string} input
 * @param {string} output
 */
function master(input, output) {
  const { final, truePeak } = AUDIO.loudness;
  const base = `loudnorm=I=${final}:TP=${truePeak}:LRA=9`;
  const first = ffmpegStderr(['-i', input, '-af', `${base}:print_format=json`, '-f', 'null', '-']);
  const json = first.slice(first.lastIndexOf('{'));
  const m = JSON.parse(json);
  const second =
    `${base}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
    `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  ffmpegStderr([
    '-y',
    '-i',
    input,
    '-af',
    `${second},aresample=${AUDIO.sampleRate}`,
    '-c:a',
    'pcm_s24le',
    output,
  ]);
}

/**
 * @param {{ force?: boolean }} [options]
 * @returns {{ master: string, built: boolean, report: Record<string, unknown> }}
 */
export function buildAudio(options = {}) {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const hash = sourceHash();
  if (!options.force && existsSync(MASTER_PATH) && existsSync(REPORT_PATH)) {
    const cached = JSON.parse(readFileSync(REPORT_PATH, 'utf8'));
    if (cached.hash === hash) {
      return { master: MASTER_PATH, built: false, report: cached };
    }
  }

  const { sampleRate } = AUDIO;
  const duration = VIDEO.duration;
  const lines = resolveVoiceover(VOICEOVER.lines, manifest);
  const cues = resolveCues(CUES, lines);

  const music = renderMusic({ sampleRate, duration });
  const sfx = renderSfx(planSfx(SFX, cues, SCENES), { sampleRate, duration });
  const clips = lines.map((line) => ({
    at: line.at,
    samples: decodeMono(join(ROOT, 'assets/audio/vo', line.file), sampleRate),
  }));
  const voice = renderVoice(clips, { sampleRate, duration });

  const stems = { voice: voice.dry, music, sfx };
  writeStereoWav(join(AUDIO_DIR, 'music.wav'), music, sampleRate);
  writeStereoWav(join(AUDIO_DIR, 'sfx.wav'), sfx, sampleRate);
  writeStereoWav(join(AUDIO_DIR, 'voice.wav'), { l: voice.dry, r: voice.dry }, sampleRate);

  const voiceLufs = measureLoudness(join(AUDIO_DIR, 'voice.wav')).lufs;
  const musicLufs = measureLoudness(join(AUDIO_DIR, 'music.wav')).lufs;
  const gainDb = {
    voice: AUDIO.loudness.voice - voiceLufs,
    music: AUDIO.loudness.music - musicLufs,
    sfx: 0,
  };
  const premaster = mixdown({
    sampleRate,
    voice: stems.voice,
    voiceRoom: voice.wet,
    music,
    sfx,
    gainDb,
  });
  const premasterPath = join(AUDIO_DIR, 'premaster.wav');
  writeStereoWav(premasterPath, premaster, sampleRate);
  master(premasterPath, MASTER_PATH);

  const final = measureLoudness(MASTER_PATH);
  const report = { hash, voiceLufs, musicLufs, gainDb, final };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  return { master: MASTER_PATH, built: true, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const started = Date.now();
  const result = buildAudio({ force: process.argv.includes('--force') });
  process.stdout.write(
    `${result.built ? 'Built' : 'Cached'} ${result.master} in ${((Date.now() - started) / 1000).toFixed(1)}s\n${JSON.stringify(result.report, null, 2)}\n`,
  );
}
