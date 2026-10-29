import { describe, expect, it } from 'vitest';

import { sceneAt, sceneById, sceneProgress, validateScenes } from '../src/core/schedule.js';

const scenes = [
  { id: 'a', start: 0, end: 2 },
  { id: 'b', start: 2, end: 5 },
];

describe('scene schedule', () => {
  it('finds scenes by id and by time', () => {
    expect(sceneById(scenes, 'b').start).toBe(2);
    expect(() => sceneById(scenes, 'missing')).toThrow(/Unknown scene/);
    expect(sceneAt(scenes, 1.9)?.id).toBe('a');
    expect(sceneAt(scenes, 2)?.id).toBe('b');
    expect(sceneAt(scenes, 5)).toBeUndefined();
  });

  it('reports progress through a scene, clamped', () => {
    const [first] = scenes;
    expect(sceneProgress(first ?? { id: '', start: 0, end: 1 }, 1)).toBe(0.5);
    expect(sceneProgress(first ?? { id: '', start: 0, end: 1 }, 9)).toBe(1);
  });

  it('accepts a contiguous schedule', () => {
    expect(validateScenes(scenes, 5)).toEqual([]);
  });

  it('flags gaps, overlaps and a wrong total', () => {
    const gap = [
      { id: 'a', start: 0, end: 2 },
      { id: 'b', start: 2.5, end: 5 },
    ];
    expect(validateScenes(gap, 5).join(' ')).toMatch(/starts at 2.5/);
    expect(validateScenes(scenes, 6).join(' ')).toMatch(/lasts 6/);
    expect(validateScenes([{ id: 'x', start: 0, end: 0 }], 0).join(' ')).toMatch(/ends before/);
  });
});
