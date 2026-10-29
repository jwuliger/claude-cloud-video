import { describe, expect, it } from 'vitest';

import {
  clamp,
  clamp01,
  decay,
  fract,
  invLerp,
  lerp,
  mod,
  remap,
  round,
  smoothstep,
} from '../src/core/math.js';

describe('math helpers', () => {
  it('clamps into a range', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
  });

  it('interpolates and inverts interpolation', () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(invLerp(10, 20, 12.5)).toBe(0.25);
    expect(invLerp(5, 5, 9)).toBe(0);
  });

  it('remaps with clamping to the output range', () => {
    expect(remap(5, 0, 10, 100, 200)).toBe(150);
    expect(remap(-5, 0, 10, 100, 200)).toBe(100);
    expect(remap(50, 0, 10, 100, 200)).toBe(200);
  });

  it('smoothstep is 0 below, 1 above and 0.5 in the middle', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
  });

  it('mod wraps negative values', () => {
    expect(mod(-1, 4)).toBe(3);
    expect(mod(9, 4)).toBe(1);
  });

  it('decay starts at 1, falls monotonically and ignores the future', () => {
    expect(decay(0, 0.2)).toBe(1);
    expect(decay(0.2, 0.2)).toBeCloseTo(Math.exp(-1));
    expect(decay(0.4, 0.2)).toBeLessThan(decay(0.2, 0.2));
    expect(decay(-0.1, 0.2)).toBe(0);
  });

  it('fract and round behave for negatives and digits', () => {
    expect(fract(-0.25)).toBeCloseTo(0.75);
    expect(round(1.23456, 2)).toBe(1.23);
  });
});
