import { describe, expect, it } from 'vitest';

import manifest from '../assets/audio/vo/manifest.json' with { type: 'json' };
import { SOUND_NAMES } from '../src/audio/sfx.js';
import { planSfx } from '../src/audio/sfx-plan.js';
import {
  AUDIO,
  BRAND,
  COPY,
  CUES,
  PALETTE,
  SCENES,
  SFX,
  VIDEO,
  VOICEOVER,
} from '../src/config/video.config.js';
import { resolveCues } from '../src/core/cues.js';
import { validateScenes } from '../src/core/schedule.js';
import { isOnBeat, totalFrames } from '../src/core/timecode.js';
import { resolveVoiceover } from '../src/core/voiceover.js';
import { SCENE_BUILDERS } from '../src/web/film.js';

const lines = resolveVoiceover(VOICEOVER.lines, manifest);
const cues = resolveCues(CUES, lines);

describe('format', () => {
  it('is 4K, with layout exactly half the render size', () => {
    expect(VIDEO.width).toBe(3840);
    expect(VIDEO.height).toBe(2160);
    expect(VIDEO.width / VIDEO.layoutWidth).toBe(2);
    expect(VIDEO.height / VIDEO.layoutHeight).toBe(2);
  });

  it('is between 30 and 60 seconds, at 30 fps or more, with whole frames', () => {
    expect(VIDEO.duration).toBeGreaterThanOrEqual(30);
    expect(VIDEO.duration).toBeLessThanOrEqual(60);
    expect(VIDEO.fps).toBeGreaterThanOrEqual(30);
    expect(Number.isInteger(VIDEO.duration * VIDEO.fps)).toBe(true);
    expect(totalFrames(VIDEO.duration, VIDEO.fps)).toBe(VIDEO.duration * VIDEO.fps);
  });
});

describe('scene schedule', () => {
  it('is contiguous and covers the whole film', () => {
    expect(validateScenes(SCENES, VIDEO.duration)).toEqual([]);
  });

  it('cuts on the beat grid so edits land with the music', () => {
    for (const scene of SCENES) {
      expect(isOnBeat(scene.start, VIDEO.bpm), `${scene.id} start ${scene.start}`).toBe(true);
    }
  });

  it('has a builder for every scene and none left over', () => {
    expect(Object.keys(SCENE_BUILDERS).sort()).toEqual(SCENES.map((scene) => scene.id).sort());
  });

  it('opens with the hook inside the first three seconds and ends on the call to action', () => {
    expect(SCENES[0]?.id).toBe('hook');
    expect(SCENES[0]?.end).toBeLessThanOrEqual(3);
    expect(SCENES[SCENES.length - 1]?.id).toBe('cta');
  });
});

describe('voiceover against the schedule', () => {
  it('keeps every line inside its own scene', () => {
    for (const line of lines) {
      const scene = SCENES.find((candidate) => candidate.id === line.id);
      expect(scene, `scene for ${line.id}`).toBeDefined();
      expect(line.at).toBeGreaterThanOrEqual(scene?.start ?? Infinity);
      expect(line.end).toBeLessThanOrEqual(scene?.end ?? -Infinity);
    }
  });

  it('never overlaps and leaves room to breathe between lines', () => {
    lines.slice(1).forEach((line, index) => {
      const previous = lines[index];
      expect(line.at - (previous?.end ?? 0)).toBeGreaterThanOrEqual(0.25);
    });
  });

  it('ends the film after the narration, leaving time to read the call to action', () => {
    const last = lines[lines.length - 1];
    expect(VIDEO.duration - (last?.end ?? 0)).toBeGreaterThanOrEqual(2);
  });
});

describe('cues and sound design', () => {
  it('keeps every cue inside the film', () => {
    for (const [name, time] of Object.entries(cues)) {
      expect(time, name).toBeGreaterThanOrEqual(0);
      expect(time, name).toBeLessThan(VIDEO.duration);
    }
  });

  it('plans every sound effect with a known sound, inside the film', () => {
    const plan = planSfx(SFX, cues, SCENES);
    expect(plan.length).toBeGreaterThan(60);
    for (const { time, event } of plan) {
      expect(SOUND_NAMES, event.sound).toContain(event.sound);
      expect(time).toBeGreaterThanOrEqual(0);
      expect(time).toBeLessThan(VIDEO.duration);
    }
    expect(plan.map((item) => item.time)).toEqual(
      [...plan.map((item) => item.time)].sort((a, b) => a - b),
    );
  });

  it('rejects effects that point at nothing', () => {
    expect(() => planSfx([{ at: 'no.cue', sound: 'tick', gain: -20 }], cues, SCENES)).toThrow(
      /Unknown cue/,
    );
    expect(() => planSfx([{ scenes: ['nope'], sound: 'tick', gain: -20 }], cues, SCENES)).toThrow(
      /unknown scene/,
    );
    expect(() => planSfx([{ sound: 'tick', gain: -20 }], cues, SCENES)).toThrow(/needs "at"/);
  });

  it('masters to a sensible loudness with headroom', () => {
    expect(AUDIO.loudness.final).toBeLessThanOrEqual(-14);
    expect(AUDIO.loudness.truePeak).toBeLessThanOrEqual(-1);
  });
});

describe('brand and copy', () => {
  it('uses the exact call to action', () => {
    expect(BRAND.callToAction).toBe('Join early access at livemotionlabs.com');
    expect(VOICEOVER.lines.at(-1)?.caption).toBe(BRAND.callToAction);
  });

  it('uses one accent colour and valid hex values', () => {
    for (const value of Object.values(PALETTE)) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('makes no claims beyond the approved list', () => {
    const text = JSON.stringify([VOICEOVER.lines.map((line) => line.caption), COPY]).toLowerCase();
    for (const banned of [
      '4k',
      'fps',
      'free trial',
      'pricing',
      '$',
      'launched',
      'available now',
      'best',
      '#1',
    ]) {
      expect(text, banned).not.toContain(banned);
    }
  });

  it('says it is not generative AI video, and never that it is', () => {
    const captions = VOICEOVER.lines.map((line) => line.caption).join(' ');
    expect(captions).toMatch(/not generative AI video/);
    expect(captions.toLowerCase()).not.toMatch(/powered by ai|ai-generated|ai generated/);
  });
});
