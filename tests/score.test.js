import { describe, expect, it } from 'vitest';

import { DRUMS, VIDEO } from '../src/config/video.config.js';
import { hitTimes, lastHitIndex, pulse } from '../src/core/score.js';

describe('beat map', () => {
  it('places quarter-note hits on the beat grid', () => {
    const hits = hitTimes([{ from: 0, to: 4, steps: [0, 4, 8, 12] }], 120, 4);
    expect(hits).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
  });

  it('respects the section window, inclusive start and exclusive end', () => {
    const hits = hitTimes([{ from: 1.5, to: 3, steps: [0, 4, 8, 12] }], 120, 4);
    expect(hits).toEqual([1.5, 2, 2.5]);
  });

  it('turns sixteenth steps into quarter-beat offsets', () => {
    const hits = hitTimes([{ from: 0, to: 2, steps: [2, 14] }], 120, 4);
    expect(hits).toEqual([0.25, 1.75]);
  });

  it('keeps the film kick list sorted and starting at the heartbeat', () => {
    const kicks = hitTimes(DRUMS['kick'] ?? [], VIDEO.bpm, VIDEO.beatsPerBar);
    expect(kicks[0]).toBe(1.5);
    expect([...kicks].sort((a, b) => a - b)).toEqual(kicks);
    expect(kicks).toContain(8);
    expect(kicks).toContain(52);
    expect(kicks.some((time) => time >= 56)).toBe(false);
  });

  it('finds the last hit at or before a time', () => {
    const hits = [1, 2, 3];
    expect(lastHitIndex(hits, 0.5)).toBe(-1);
    expect(lastHitIndex(hits, 2)).toBe(1);
    expect(lastHitIndex(hits, 2.9)).toBe(1);
    expect(lastHitIndex(hits, 9)).toBe(2);
  });

  it('pulses to 1 on a hit and fades until the next', () => {
    const hits = [1, 2];
    expect(pulse(hits, 0.5, 0.2)).toBe(0);
    expect(pulse(hits, 1, 0.2)).toBe(1);
    expect(pulse(hits, 1.2, 0.2)).toBeCloseTo(Math.exp(-1));
    expect(pulse(hits, 2, 0.2)).toBe(1);
  });
});
