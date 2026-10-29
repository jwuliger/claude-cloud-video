import { describe, expect, it } from 'vitest';

import { hexToRgb, mix, rgba } from '../src/core/color.js';
import { fbm1, noise1, noise2 } from '../src/core/noise.js';
import { createRng, hash2, hashString, range } from '../src/core/rng.js';

describe('seeded randomness', () => {
  it('repeats exactly for the same seed and differs between seeds', () => {
    const a = createRng(7);
    const b = createRng(7);
    const c = createRng(8);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect([c(), c(), c()]).not.toEqual(first);
  });

  it('stays inside [0, 1) and spreads out', () => {
    const rng = createRng(1);
    const values = Array.from({ length: 2000 }, () => rng());
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });

  it('hashes strings and coordinates deterministically', () => {
    expect(hashString('seed')).toBe(hashString('seed'));
    expect(hashString('seed')).not.toBe(hashString('seeds'));
    expect(hash2(3, 4, 5)).toBe(hash2(3, 4, 5));
    expect(range(createRng(2), 10, 20)).toBeGreaterThanOrEqual(10);
  });
});

describe('noise', () => {
  it('is smooth, bounded and repeatable', () => {
    expect(noise1(3.3, 1)).toBe(noise1(3.3, 1));
    for (let x = 0; x < 20; x += 0.01) {
      expect(Math.abs(noise1(x, 2))).toBeLessThanOrEqual(1);
      expect(Math.abs(noise1(x + 0.001, 2) - noise1(x, 2))).toBeLessThan(0.05);
      expect(Math.abs(noise2(x, x / 2, 2))).toBeLessThanOrEqual(1);
      expect(Math.abs(fbm1(x, 2))).toBeLessThanOrEqual(1);
    }
  });
});

describe('colour helpers', () => {
  it('parses hex and builds CSS colours', () => {
    expect(hexToRgb('#ff5a2e')).toEqual([255, 90, 46]);
    expect(rgba('#ffffff', 0.5)).toBe('rgb(255 255 255 / 0.500)');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('rgb(128 128 128)');
  });
});
