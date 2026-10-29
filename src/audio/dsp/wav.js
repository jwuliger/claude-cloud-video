/** Minimal WAV reading and writing for the offline audio build. */

import { readFileSync, writeFileSync } from 'node:fs';

const HEADER_BYTES = 44;
const PCM = 1;
const FLOAT = 3;

/**
 * @typedef {object} Stereo
 * @property {Float32Array} l
 * @property {Float32Array} r
 */

/**
 * Write a stereo 32-bit float WAV.
 * @param {string} path
 * @param {Stereo} audio
 * @param {number} sampleRate
 */
export function writeStereoWav(path, audio, sampleRate) {
  const frames = audio.l.length;
  const dataBytes = frames * 2 * 4;
  const buffer = Buffer.alloc(HEADER_BYTES + dataBytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(FLOAT, 20);
  buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 8, 28);
  buffer.writeUInt16LE(8, 32);
  buffer.writeUInt16LE(32, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < frames; i += 1) {
    buffer.writeFloatLE(audio.l[i] ?? 0, HEADER_BYTES + i * 8);
    buffer.writeFloatLE(audio.r[i] ?? 0, HEADER_BYTES + i * 8 + 4);
  }
  writeFileSync(path, buffer);
}

/**
 * Read format information from a WAV file header.
 * @param {string} path
 * @returns {{ sampleRate: number, channels: number, bitsPerSample: number, frames: number, format: number }}
 */
export function readWavInfo(path) {
  const data = readFileSync(path);
  let offset = 12;
  let info = { sampleRate: 0, channels: 0, bitsPerSample: 0, format: 0 };
  while (offset + 8 <= data.length) {
    const id = data.toString('ascii', offset, offset + 4);
    const size = data.readUInt32LE(offset + 4);
    if (id === 'fmt ') {
      info = {
        format: data.readUInt16LE(offset + 8),
        channels: data.readUInt16LE(offset + 10),
        sampleRate: data.readUInt32LE(offset + 12),
        bitsPerSample: data.readUInt16LE(offset + 22),
      };
    }
    if (id === 'data') {
      const bytesPerFrame = (info.bitsPerSample / 8) * info.channels;
      return { ...info, frames: Math.floor(size / bytesPerFrame) };
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error(`No data chunk in ${path}`);
}

/**
 * Read any PCM or float WAV as one channel of floats (first channel only).
 * @param {string} path
 * @returns {{ samples: Float32Array, sampleRate: number }}
 */
export function readWavMono(path) {
  const data = readFileSync(path);
  const info = readWavInfo(path);
  const start = data.indexOf('data', 12, 'ascii') + 8;
  const bytes = info.bitsPerSample / 8;
  const stride = bytes * info.channels;
  const samples = new Float32Array(info.frames);
  for (let i = 0; i < info.frames; i += 1) {
    const at = start + i * stride;
    if (info.format === FLOAT) {
      samples[i] = data.readFloatLE(at);
    } else if (info.format === PCM && info.bitsPerSample === 24) {
      samples[i] = data.readIntLE(at, 3) / 8388608;
    } else if (info.format === PCM && info.bitsPerSample === 16) {
      samples[i] = data.readInt16LE(at) / 32768;
    } else {
      throw new Error(`Unsupported WAV format in ${path}`);
    }
  }
  return { samples, sampleRate: info.sampleRate };
}
