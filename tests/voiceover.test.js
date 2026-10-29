import { describe, expect, it } from 'vitest';

import manifest from '../assets/audio/vo/manifest.json' with { type: 'json' };
import { CUES, VOICEOVER } from '../src/config/video.config.js';
import { cue, resolveCues } from '../src/core/cues.js';
import { captionChunks, resolveVoiceover, wordKey, wordStart } from '../src/core/voiceover.js';

const lines = resolveVoiceover(VOICEOVER.lines, manifest);
const line = (/** @type {string} */ id) => {
  const found = lines.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`missing ${id}`);
  }
  return found;
};

describe('voiceover timing', () => {
  it('resolves every scripted line against the measured manifest', () => {
    expect(lines).toHaveLength(VOICEOVER.lines.length);
    for (const resolved of lines) {
      expect(resolved.duration).toBeGreaterThan(0.5);
      expect(resolved.end).toBeCloseTo(resolved.at + resolved.duration, 2);
    }
  });

  it('turns clip-relative word times into absolute times', () => {
    const rhythm = wordStart(lines, 'analyze', 'rhythm');
    expect(rhythm).toBeCloseTo(21.8 + 1.348, 2);
  });

  it('looks words up ignoring case and punctuation, and fails loudly otherwise', () => {
    expect(wordKey('Hand-written')).toBe('handwritten');
    expect(wordStart(lines, 'hook', 'PULSE')).toBeGreaterThan(wordStart(lines, 'hook', 'song'));
    expect(() => wordStart(lines, 'hook', 'banana')).toThrow(/not found/);
    expect(() => wordStart(lines, 'nope', 'x')).toThrow(/Unknown voiceover line/);
  });

  it('refuses a script line with no audio', () => {
    expect(() =>
      resolveVoiceover([{ id: 'ghost', speak: 'x', caption: 'x', at: 0 }], { lines: {} }),
    ).toThrow(/missing from the manifest/);
  });
});

describe('captions', () => {
  it('splits a two-sentence line into two timed chunks', () => {
    const chunks = captionChunks(line('engines'));
    expect(chunks.map((chunk) => chunk.words.length)).toEqual([3, 7]);
    const [first, second] = chunks;
    expect(second?.start ?? 0).toBeGreaterThan(first?.end ?? 0);
  });

  it('keeps single sentences whole', () => {
    expect(captionChunks(line('hook'))).toHaveLength(1);
  });

  it('lights the URL when "Live" is spoken, not when the line starts', () => {
    const [chunk] = captionChunks(line('cta'));
    const url = chunk?.words[chunk.words.length - 1];
    expect(url?.text).toBe('livemotionlabs.com');
    expect(url?.start).toBeCloseTo(wordStart(lines, 'cta', 'Live'), 3);
  });
});

describe('cues', () => {
  const cues = resolveCues(CUES, lines);

  it('resolves fixed and word-based cues', () => {
    expect(cue(cues, 'product.drop')).toBe(8);
    expect(cue(cues, 'lane.rhythm')).toBeCloseTo(wordStart(lines, 'analyze', 'rhythm') - 0.1, 3);
  });

  it('throws on an unknown cue', () => {
    expect(() => cue(cues, 'nothing.here')).toThrow(/Unknown cue/);
  });

  it('rejects a cue with neither a time nor a word', () => {
    expect(() => resolveCues({ bad: {} }, lines)).toThrow(/either "at" or both/);
  });
});
