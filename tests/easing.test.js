import { describe, expect, it } from 'vitest';

import { cubicBezier } from '../src/core/easing.js';

describe('cubicBezier', () => {
  it('pins the end points', () => {
    const ease = cubicBezier(0.16, 1, 0.3, 1);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(-0.5)).toBe(0);
    expect(ease(1.5)).toBe(1);
  });

  it('matches the CSS "ease" curve at known points', () => {
    const ease = cubicBezier(0.25, 0.1, 0.25, 1);
    expect(ease(0.5)).toBeCloseTo(0.8024, 3);
  });

  it('is linear when the control points lie on the diagonal', () => {
    const linear = cubicBezier(0.25, 0.25, 0.75, 0.75);
    expect(linear(0.3)).toBeCloseTo(0.3, 4);
  });

  it('never goes backwards for the brand curves', () => {
    for (const curve of [
      [0.16, 1, 0.3, 1],
      [0.65, 0, 0.35, 1],
      [0.7, 0, 0.84, 0],
    ]) {
      const ease = cubicBezier(curve[0] ?? 0, curve[1] ?? 0, curve[2] ?? 1, curve[3] ?? 1);
      let previous = 0;
      for (let i = 1; i <= 100; i += 1) {
        const value = ease(i / 100);
        expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
        previous = value;
      }
    }
  });
});
