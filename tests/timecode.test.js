import { describe, expect, it } from 'vitest';

import {
  barSeconds,
  beatSeconds,
  beatsToSeconds,
  formatTime,
  frameToSeconds,
  isOnBeat,
  previousBeat,
  secondsToBeats,
  secondsToFrame,
  totalFrames,
} from '../src/core/timecode.js';

describe('frames and seconds', () => {
  it('round-trips every frame of a 60 fps film', () => {
    for (let frame = 0; frame < 3480; frame += 1) {
      expect(secondsToFrame(frameToSeconds(frame, 60), 60)).toBe(frame);
    }
  });

  it('counts the frames needed for a duration', () => {
    expect(totalFrames(58, 60)).toBe(3480);
    expect(totalFrames(58, 30)).toBe(1740);
  });
});

describe('beats', () => {
  it('derives beat and bar length from the tempo', () => {
    expect(beatSeconds(120)).toBe(0.5);
    expect(barSeconds(120, 4)).toBe(2);
  });

  it('converts between beats and seconds', () => {
    expect(secondsToBeats(8, 120)).toBe(16);
    expect(beatsToSeconds(16, 120)).toBe(8);
  });

  it('finds the previous beat and detects the grid', () => {
    expect(previousBeat(8.4, 120)).toBe(8);
    expect(previousBeat(8.5, 120)).toBe(8.5);
    expect(isOnBeat(52, 120)).toBe(true);
    expect(isOnBeat(52.13, 120)).toBe(false);
  });

  it('formats times for messages', () => {
    expect(formatTime(61.5)).toBe('1:01.500');
  });
});
