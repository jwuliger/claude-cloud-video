/**
 * Single source of truth for the film: format, brand, copy, timing, colour and audio settings.
 * Nothing else in the repository hard-codes text, seconds or colours.
 */

/** @typedef {import('../core/voiceover.js').ScriptLine} ScriptLine */
/** @typedef {import('../core/cues.js').CueSpec} CueSpec */

/**
 * @typedef {object} SceneConfig
 * @property {string} id
 * @property {number} start Seconds.
 * @property {number} end Seconds.
 */

/** Output format. Layout is authored at 1920x1080 and rendered at 2x for 4K. */
export const VIDEO = Object.freeze({
  width: 3840,
  height: 2160,
  layoutWidth: 1920,
  layoutHeight: 1080,
  fps: 60,
  duration: 58,
  bpm: 120,
  beatsPerBar: 4,
  /** Master seed. Every procedural shape in the film derives from it. */
  seed: 20481,
});

export const BRAND = Object.freeze({
  name: 'Live Motion Labs',
  domain: 'livemotionlabs.com',
  callToAction: 'Join early access at livemotionlabs.com',
});

/** One dark base, one accent, neutral grays. */
export const PALETTE = Object.freeze({
  bg: '#08080a',
  bgLift: '#111114',
  surface: '#0e0e11',
  line: '#2b2c32',
  lineStrong: '#4b4c55',
  textDim: '#7a7b84',
  textMid: '#a8a9b1',
  text: '#f5f4f0',
  accent: '#ff5a2e',
});

/** One family only: Geist (SIL Open Font License), variable weight. */
export const TYPE = Object.freeze({
  family: 'Geist',
  file: '/assets/fonts/Geist-Variable.woff2',
  weight: { light: 300, regular: 400, label: 450, medium: 500, semibold: 600 },
  /** Pixel sizes in the 1920x1080 layout. */
  size: {
    display: 128,
    headline: 76,
    title: 44,
    body: 26,
    caption: 30,
    label: 15,
    tag: 15,
    index: 12,
    code: 25,
  },
  tracking: { display: '-0.045em', headline: '-0.035em', label: '0.18em', index: '0.12em' },
});

export const LAYOUT = Object.freeze({
  margin: 120,
  captionBottom: 92,
  topBar: 56,
});

/** Brand easing curves (cubic-bezier control points) and standard durations in seconds. */
export const MOTION = Object.freeze({
  ease: {
    out: [0.16, 1, 0.3, 1],
    inOut: [0.65, 0, 0.35, 1],
    in: [0.7, 0, 0.84, 0],
  },
  duration: { micro: 0.25, short: 0.5, base: 0.8, long: 1.3 },
  /** Time before a scene ends when its content starts leaving. */
  exit: 0.3,
  /** Seconds after a cut before a scene's first element starts to arrive. */
  sceneLead: 0.05,
});

/**
 * Scenes are contiguous. Starts sit on the beat grid so cuts land with the music.
 * @type {readonly SceneConfig[]}
 */
export const SCENES = Object.freeze([
  { id: 'hook', start: 0, end: 3 },
  { id: 'problem', start: 3, end: 8 },
  { id: 'product', start: 8, end: 12 },
  { id: 'engines', start: 12, end: 17.5 },
  { id: 'upload', start: 17.5, end: 21.5 },
  { id: 'analyze', start: 21.5, end: 27.5 },
  { id: 'genre', start: 27.5, end: 31 },
  { id: 'lyrics', start: 31, end: 34 },
  { id: 'camera', start: 34, end: 37.5 },
  { id: 'seed', start: 37.5, end: 41.5 },
  { id: 'choose', start: 41.5, end: 45.5 },
  { id: 'quality', start: 45.5, end: 49.5 },
  { id: 'lab', start: 49.5, end: 52 },
  { id: 'cta', start: 52, end: 58 },
]);

/** Voiceover: Kokoro-82M, one clip per line so every line has exact audio timing. */
export const VOICEOVER = Object.freeze({
  voice: 'af_heart',
  speed: 1,
  lang: 'en-us',
  /** @type {readonly ScriptLine[]} */
  lines: [
    {
      id: 'hook',
      speak: 'Every song has a pulse.',
      caption: 'Every song has a pulse.',
      at: 0.58,
    },
    {
      id: 'problem',
      speak: 'Most music videos are slow to make, and rarely follow the beat.',
      caption: 'Most music videos are slow to make, and rarely follow the beat.',
      at: 3.3,
    },
    {
      id: 'product',
      speak: 'Live Motion Labs turns your song into a music video.',
      caption: 'Live Motion Labs turns your song into a music video.',
      at: 8.3,
    },
    {
      id: 'engines',
      speak: 'Hand-written animation engines. Rules and math, not generative AI video.',
      caption: 'Hand-written animation engines. Rules and math, not generative AI video.',
      at: 12.1,
    },
    {
      id: 'upload',
      speak: 'Upload a song. The engine reads the whole track ahead of time.',
      caption: 'Upload a song. The engine reads the whole track ahead of time.',
      at: 17.8,
    },
    {
      id: 'analyze',
      speak:
        'It finds the beat, the rhythm, the lows, the mids, the vocals, and the instrumentals.',
      caption:
        'It finds the beat, the rhythm, the lows, the mids, the vocals, and the instrumentals.',
      at: 21.8,
    },
    {
      id: 'genre',
      speak: 'It detects the genre, and adapts the look to fit.',
      caption: 'It detects the genre, and adapts the look to fit.',
      at: 27.8,
    },
    {
      id: 'lyrics',
      speak: 'Lyrics land on time, synced to the music.',
      caption: 'Lyrics land on time, synced to the music.',
      at: 31.3,
    },
    {
      id: 'camera',
      speak: 'The camera is always moving, and unique to each song.',
      caption: 'The camera is always moving, and unique to each song.',
      at: 34.3,
    },
    {
      id: 'seed',
      speak: 'Every video gets its own seed, so no two are alike.',
      caption: 'Every video gets its own seed, so no two are alike.',
      at: 37.75,
    },
    {
      id: 'choose',
      speak: 'Choose an experience. Change the backdrop and captions.',
      caption: 'Choose an experience. Change the backdrop and captions.',
      at: 41.8,
    },
    {
      id: 'quality',
      speak: 'Premium quality, rendered in real time using the GPU.',
      caption: 'Premium quality, rendered in real time using the GPU.',
      at: 45.6,
    },
    {
      id: 'lab',
      speak: 'A self-serve lab, by subscription.',
      caption: 'A self-serve lab, by subscription.',
      at: 49.7,
    },
    {
      id: 'cta',
      speak: 'Join early access at Live Motion Labs dot com.',
      caption: 'Join early access at livemotionlabs.com',
      /** The URL is one caption word; it lights up when "Live" is spoken. */
      captionAlign: [0, 1, 2, 3, 4],
      at: 52.3,
    },
  ],
});

/**
 * @typedef {object} PatternSection
 * @property {number} from Seconds, inclusive.
 * @property {number} to Seconds, exclusive.
 * @property {readonly number[]} steps Sixteenth-note steps (0-15) that sound within each bar.
 */

/**
 * Drum patterns on a 16-step bar grid. The soundtrack and the on-screen pulses both read the
 * kick list, so picture and sound cannot drift apart.
 * @type {Readonly<Record<string, readonly PatternSection[]>>}
 */
export const DRUMS = Object.freeze({
  kick: [
    { from: 1.5, to: 3, steps: [0, 4, 8, 12] },
    { from: 8, to: 56, steps: [0, 4, 8, 12] },
  ],
  hat: [{ from: 12, to: 56, steps: [2, 6, 10, 14] }],
  shaker: [{ from: 21.5, to: 56, steps: [1, 3, 5, 7, 9, 11, 13, 15] }],
  clap: [{ from: 12, to: 56, steps: [4, 12] }],
});

/**
 * Harmony and arrangement. 120 BPM, C major / A minor, four chords of one bar each.
 */
export const SCORE = Object.freeze({
  loop: ['Am9', 'Fmaj7', 'Cmaj9', 'G69'],
  /** Bar index to chord, for the final cadence into C. */
  overrides: Object.freeze({ 28: 'Cmaj9' }),
  voicings: Object.freeze({
    Am9: {
      root: 'A2',
      pad: ['E3', 'G3', 'B3', 'C4', 'E4'],
      arp: ['A3', 'C4', 'E4', 'G4', 'B4', 'E5'],
      bell: ['B5', 'E6', 'C6'],
    },
    Fmaj7: {
      root: 'F2',
      pad: ['C3', 'E3', 'A3', 'C4', 'E4'],
      arp: ['F3', 'A3', 'C4', 'E4', 'A4', 'C5'],
      bell: ['A5', 'E6', 'C6'],
    },
    Cmaj9: {
      root: 'C3',
      pad: ['G3', 'B3', 'D4', 'E4', 'G4'],
      arp: ['C4', 'E4', 'G4', 'B4', 'D5', 'G5'],
      bell: ['D6', 'B5', 'G5'],
    },
    G69: {
      root: 'G2',
      pad: ['D3', 'A3', 'B3', 'D4', 'E4'],
      arp: ['G3', 'B3', 'D4', 'E4', 'A4', 'D5'],
      bell: ['E6', 'B5', 'D6'],
    },
  }),
  /** Which layers play when. `drift` plays notes that slide off the grid, to match the problem scene. */
  sections: [
    { from: 0, to: 3, drone: 1, pad: 0.55, bass: 'none', arp: 'none', bells: false },
    { from: 3, to: 8, drone: 1, pad: 0.4, bass: 'none', arp: 'drift', bells: false },
    { from: 8, to: 17.5, drone: 0, pad: 0.8, bass: 'pulse', arp: 'eighth', bells: false },
    { from: 17.5, to: 21.5, drone: 0, pad: 0.9, bass: 'long', arp: 'none', bells: true },
    { from: 21.5, to: 27.5, drone: 0, pad: 0.8, bass: 'pulse', arp: 'sixteenth', bells: false },
    { from: 27.5, to: 45.5, drone: 0, pad: 0.9, bass: 'pulse', arp: 'eighth', bells: true },
    { from: 45.5, to: 52, drone: 0, pad: 1, bass: 'pulse', arp: 'sixteenth', bells: true },
    { from: 52, to: 56, drone: 0, pad: 1, bass: 'long', arp: 'eighth', bells: true },
    { from: 56, to: 58, drone: 0, pad: 1, bass: 'none', arp: 'none', bells: true },
  ],
  /** The problem scene's notes drift this late (seconds) by the time the beat is lost. */
  driftSeconds: 0.14,
  driftFrom: 3.5,
  driftTo: 7,
});

/** Mix targets and mastering. Loudness values are LUFS, gains are dB. */
export const AUDIO = Object.freeze({
  sampleRate: 48000,
  loudness: { voice: -19, music: -24, final: -15, truePeak: -1.5 },
  /** Music drops by this many dB while the narrator speaks, and sound effects by half as much. */
  duck: { depthDb: 7, attack: 0.05, release: 0.45 },
  musicFadeOut: { from: 56.2, to: 58 },
  voiceEq: {
    highpassHz: 90,
    presenceHz: 3200,
    presenceDb: 2.2,
    lowpassHz: 8200,
    sibilanceHz: 6800,
    sibilanceDb: -3,
  },
  voiceRoom: { rt60: 0.9, wetDb: -23 },
  musicReverb: { rt60: 3.1, damping: 0.4 },
  delayTime: 0.375,
});

/**
 * Sound effects. `at` is a cue name or seconds; `offset` is added to it. `gain` is dB below the
 * sound's own peak. `scenes` plays the same effect at the start of each listed scene.
 * @typedef {object} SfxEvent
 * @property {string | number} [at]
 * @property {readonly string[]} [scenes]
 * @property {number} [offset]
 * @property {string} sound
 * @property {number} gain
 * @property {string} [note]
 * @property {number} [duration]
 * @property {number} [pan]
 * @property {'up' | 'down'} [direction]
 * @property {readonly string[]} [notes]
 */

/** @type {readonly SfxEvent[]} */
export const SFX = Object.freeze([
  { at: 0, sound: 'swell', duration: 1.5, gain: -16 },
  { at: 2.55, sound: 'whoosh', direction: 'down', duration: 0.6, gain: -30 },
  { at: 'problem.slow', sound: 'pop', gain: -26 },
  { at: 'problem.rarely', sound: 'pop', gain: -26 },
  { at: 6.2, sound: 'riser', duration: 1.8, gain: -17 },
  { at: 'product.drop', sound: 'impact', gain: -9 },
  { at: 'product.drop', sound: 'ping', note: 'C6', gain: -20 },
  { at: 'product.music', sound: 'pop', gain: -26 },
  {
    scenes: [
      'engines',
      'upload',
      'analyze',
      'genre',
      'lyrics',
      'camera',
      'seed',
      'choose',
      'quality',
      'lab',
    ],
    sound: 'whoosh',
    direction: 'up',
    duration: 0.7,
    gain: -31,
  },
  { at: 'engines.headline', offset: 0.35, sound: 'pop', gain: -27, pan: -0.4 },
  { at: 'engines.headline', offset: 0.49, sound: 'pop', gain: -27 },
  { at: 'engines.headline', offset: 0.63, sound: 'pop', gain: -27, pan: 0.4 },
  { at: 'engines.rules', offset: 0, sound: 'tick', note: 'E6', gain: -26 },
  { at: 'engines.rules', offset: 0.28, sound: 'tick', note: 'G6', gain: -26 },
  { at: 'engines.rules', offset: 0.56, sound: 'tick', note: 'C7', gain: -26 },
  { at: 'engines.not', offset: 0.4, sound: 'whoosh', direction: 'up', duration: 0.5, gain: -30 },
  { at: 'upload.drop', sound: 'whoosh', direction: 'down', duration: 0.6, gain: -29 },
  { at: 'upload.drop', offset: 0.7, sound: 'thud', gain: -18 },
  { at: 'upload.panel', sound: 'pop', gain: -25 },
  { at: 'upload.scan', sound: 'riser', duration: 1.4, gain: -27 },
  { at: 'upload.done', sound: 'ping', note: 'E6', gain: -21 },
  { at: 'lane.beat', sound: 'ping', note: 'C5', gain: -21, pan: -0.3 },
  { at: 'lane.rhythm', sound: 'ping', note: 'D5', gain: -21, pan: -0.15 },
  { at: 'lane.lows', sound: 'ping', note: 'E5', gain: -21 },
  { at: 'lane.mids', sound: 'ping', note: 'G5', gain: -21, pan: 0.15 },
  { at: 'lane.vocals', sound: 'ping', note: 'A5', gain: -21, pan: 0.3 },
  { at: 'lane.instrumentals', sound: 'ping', note: 'C6', gain: -20 },
  { at: 'genre.lock', offset: -0.6, sound: 'tick', note: 'C6', gain: -27 },
  { at: 'genre.lock', offset: -0.45, sound: 'tick', note: 'D6', gain: -27 },
  { at: 'genre.lock', offset: -0.3, sound: 'tick', note: 'E6', gain: -27 },
  { at: 'genre.lock', offset: -0.15, sound: 'tick', note: 'G6', gain: -27 },
  { at: 'genre.lock', sound: 'ping', note: 'C6', gain: -20 },
  { at: 'genre.adapts', sound: 'ping', note: 'E6', gain: -22 },
  { at: 'genre.look', sound: 'ping', note: 'G6', gain: -22 },
  { at: 'genre.fit', sound: 'ping', note: 'A6', gain: -22 },
  { at: 31.5, sound: 'ping', note: 'E5', gain: -24, pan: -0.2 },
  { at: 31.75, sound: 'ping', note: 'G5', gain: -26 },
  { at: 32, sound: 'ping', note: 'A5', gain: -24, pan: 0.2 },
  { at: 32.5, sound: 'ping', note: 'C6', gain: -24, pan: -0.2 },
  { at: 32.75, sound: 'ping', note: 'D6', gain: -26 },
  { at: 33, sound: 'ping', note: 'E6', gain: -23, pan: 0.2 },
  { at: 34, sound: 'whoosh', direction: 'up', duration: 3.3, gain: -26 },
  { at: 'seed.start', offset: 0.05, sound: 'whoosh', direction: 'down', duration: 1.2, gain: -29 },
  { at: 'seed.land', offset: -0.2, sound: 'tick', note: 'C6', gain: -25, pan: -0.5 },
  { at: 'seed.land', offset: -0.12, sound: 'tick', note: 'D6', gain: -25, pan: -0.35 },
  { at: 'seed.land', offset: -0.04, sound: 'tick', note: 'E6', gain: -25, pan: -0.2 },
  { at: 'seed.land', offset: 0.04, sound: 'tick', note: 'G6', gain: -25, pan: -0.05 },
  { at: 'seed.land', offset: 0.12, sound: 'tick', note: 'A6', gain: -25, pan: 0.1 },
  { at: 'seed.land', offset: 0.2, sound: 'tick', note: 'C7', gain: -25, pan: 0.25 },
  { at: 'seed.land', offset: 0.28, sound: 'tick', note: 'D7', gain: -25, pan: 0.4 },
  { at: 'seed.land', offset: 0.36, sound: 'tick', note: 'E7', gain: -25, pan: 0.5 },
  { at: 'seed.alike', offset: 0, sound: 'ping', note: 'C5', gain: -22, pan: -0.45 },
  { at: 'seed.alike', offset: 0.17, sound: 'ping', note: 'E5', gain: -22, pan: -0.15 },
  { at: 'seed.alike', offset: 0.34, sound: 'ping', note: 'G5', gain: -22, pan: 0.15 },
  { at: 'seed.alike', offset: 0.51, sound: 'ping', note: 'C6', gain: -21, pan: 0.45 },
  { at: 'choose.experience', offset: 0.15, sound: 'tick', note: 'G6', gain: -23 },
  { at: 'choose.experience', offset: 0.65, sound: 'tick', note: 'G6', gain: -23 },
  { at: 'choose.backdrop', offset: 0.15, sound: 'tick', note: 'A6', gain: -23 },
  { at: 'choose.backdrop', offset: 0.6, sound: 'tick', note: 'A6', gain: -23 },
  { at: 'choose.captions', offset: 0.12, sound: 'tick', note: 'C7', gain: -23 },
  { at: 'choose.captions', offset: 0.55, sound: 'tick', note: 'C7', gain: -23 },
  { at: 'quality.premium', sound: 'ping', note: 'G5', gain: -22 },
  { at: 'quality.realtime', sound: 'pop', gain: -25 },
  { at: 'quality.gpu', sound: 'ping', note: 'C6', gain: -21 },
  { at: 'lab.self', sound: 'pop', gain: -25 },
  { at: 'lab.subscription', sound: 'pop', gain: -25 },
  { at: 'lab.subscription', offset: 0.35, sound: 'ping', note: 'E6', gain: -23 },
  { at: 49.2, sound: 'riser', duration: 0.8, gain: -26 },
  { at: 'cta.drop', sound: 'impact', gain: -8 },
  { at: 'cta.drop', sound: 'chime', notes: ['C5', 'G5', 'C6'], gain: -21 },
  { at: 'cta.join', sound: 'tick', note: 'E6', gain: -26 },
  { at: 'cta.early', sound: 'tick', note: 'G6', gain: -26 },
  { at: 'cta.access', sound: 'tick', note: 'C7', gain: -26 },
  { at: 'cta.domain', offset: 0.1, sound: 'chime', notes: ['C5', 'E5', 'G5', 'C6'], gain: -19 },
]);

/**
 * Named moments shared by the visuals and the sound design.
 * @type {Readonly<Record<string, CueSpec>>}
 */
export const CUES = Object.freeze({
  'hook.ignite': { line: 'hook', word: 'pulse' },
  'problem.slow': { line: 'problem', word: 'slow', offset: -0.1 },
  'problem.rarely': { line: 'problem', word: 'rarely', offset: -0.1 },
  'problem.collapse': { at: 7 },
  'product.drop': { at: 8 },
  'product.music': { line: 'product', word: 'music', offset: -0.15 },
  'engines.headline': { line: 'engines', word: 'Hand-written', offset: -0.1 },
  'engines.rules': { line: 'engines', word: 'Rules', offset: -0.1 },
  'engines.not': { line: 'engines', word: 'not', offset: -0.05 },
  'upload.drop': { line: 'upload', word: 'Upload', offset: -0.1 },
  'upload.panel': { line: 'upload', word: 'song', offset: 0.1 },
  'upload.scan': { line: 'upload', word: 'reads' },
  'upload.done': { line: 'upload', word: 'time', offset: 0.25 },
  'lane.beat': { line: 'analyze', word: 'beat', offset: -0.1 },
  'lane.rhythm': { line: 'analyze', word: 'rhythm', offset: -0.1 },
  'lane.lows': { line: 'analyze', word: 'lows', offset: -0.1 },
  'lane.mids': { line: 'analyze', word: 'mids', offset: -0.1 },
  'lane.vocals': { line: 'analyze', word: 'vocals', offset: -0.1 },
  'lane.instrumentals': { line: 'analyze', word: 'instrumentals', offset: -0.1 },
  'genre.detects': { line: 'genre', word: 'detects', offset: -0.1 },
  'genre.lock': { line: 'genre', word: 'genre' },
  'genre.adapts': { line: 'genre', word: 'adapts', offset: -0.05 },
  'genre.look': { line: 'genre', word: 'look', offset: -0.05 },
  'genre.fit': { line: 'genre', word: 'fit', offset: -0.05 },
  'lyrics.start': { line: 'lyrics', word: 'Lyrics', offset: -0.1 },
  'camera.moving': { line: 'camera', word: 'moving', offset: -0.1 },
  'camera.unique': { line: 'camera', word: 'unique', offset: -0.1 },
  'seed.start': { line: 'seed', word: 'Every', offset: -0.05 },
  'seed.land': { line: 'seed', word: 'seed' },
  'seed.alike': { line: 'seed', word: 'no', offset: -0.05 },
  'choose.experience': { line: 'choose', word: 'experience', offset: -0.1 },
  'choose.backdrop': { line: 'choose', word: 'backdrop', offset: -0.1 },
  'choose.captions': { line: 'choose', word: 'captions', offset: -0.1 },
  'quality.premium': { line: 'quality', word: 'Premium', offset: -0.05 },
  'quality.realtime': { line: 'quality', word: 'real', offset: -0.05 },
  'quality.gpu': { line: 'quality', word: 'GPU', offset: -0.05 },
  'lab.self': { line: 'lab', word: 'self-serve', offset: -0.05 },
  'lab.subscription': { line: 'lab', word: 'subscription', offset: -0.05 },
  'cta.drop': { at: 52 },
  'cta.join': { line: 'cta', word: 'Join', offset: -0.1 },
  'cta.early': { line: 'cta', word: 'early', offset: -0.1 },
  'cta.access': { line: 'cta', word: 'access', offset: -0.1 },
  'cta.domain': { line: 'cta', word: 'Live', offset: -0.1 },
  'chrome.in': { at: 12.4 },
  'chrome.out': { at: 52 },
  'note.in': { at: 28 },
  'note.out': { at: 49.5 },
});

/** On-screen copy, by scene. */
export const COPY = Object.freeze({
  illustrativeNote: 'Illustrative preview',
  hook: { words: ['Every', 'song', 'has', 'a', 'pulse.'], accentWord: 4 },
  problem: {
    lines: ['Slow to make.', 'Out of step.'],
    beatLabel: 'Song beat',
    cutsLabel: 'Video cuts',
  },
  product: { tagline: 'Music videos, built from code.', taglineAccent: 'code.' },
  engines: {
    headline: 'Hand-written animation engines.',
    nodes: { song: 'Song', engine: 'Engine', video: 'Video' },
    rules: ['pulse = decay(beat)', 'y = noise(x, seed)', 'look = style(genre)'],
    /** Names in the rules that come from the song or the seed; they are drawn in the accent. */
    inputs: ['beat', 'seed', 'genre'],
    rejected: 'Generative AI video',
  },
  upload: {
    zone: 'Drop a song',
    file: 'midnight-drive.wav',
    length: '3:24',
    reading: 'Reading full track',
    done: 'Full track read',
  },
  analyze: {
    lanes: [
      { id: 'beat', label: 'Beat' },
      { id: 'rhythm', label: 'Rhythm' },
      { id: 'lows', label: 'Lows' },
      { id: 'mids', label: 'Mids' },
      { id: 'vocals', label: 'Vocals' },
      { id: 'instrumentals', label: 'Instrumentals' },
    ],
  },
  genre: {
    label: 'Genre detected',
    items: [
      { name: 'Electronic', look: 'contours' },
      { name: 'Acoustic', look: 'rings' },
      { name: 'Hip-hop', look: 'bars' },
      { name: 'Rock', look: 'shards' },
    ],
  },
  lyrics: {
    lines: [
      ['Hold', 'the', 'night'],
      ['a', 'little', 'longer'],
    ],
    /** Seconds when each word lands, on the beat grid. */
    times: [31.5, 31.75, 32, 32.5, 32.75, 33],
    ticker: { from: 31.4, to: 33.6 },
  },
  camera: { headline: 'Always moving.', sub: 'Unique to each song.', inset: 'Camera path' },
  seed: {
    label: 'Seed',
    digits: '48201977',
    tiles: [1017, 2290, 5531, 8842],
    tileLabel: 'Seed',
    /** Each digit lands this long before / after the word "seed", one after another. */
    roll: { start: 0.1, firstLanding: -0.2, stagger: 0.08 },
  },
  choose: {
    experience: {
      label: 'Experience',
      looks: ['contours', 'rings', 'bars', 'shards'],
    },
    backdrop: { label: 'Backdrop', items: ['Plain', 'Grid', 'Glow'] },
    captions: {
      label: 'Captions',
      items: ['Minimal', 'Bold', 'Outline'],
      sample: 'Hold the night',
    },
  },
  quality: { live: 'Live', gpu: 'GPU', chips: ['Premium quality', 'Real time', 'GPU'] },
  lab: { title: 'Self-serve lab', rows: ['Self-serve', 'Subscription'], pill: 'Early access open' },
  cta: { headline: ['Join', 'early', 'access'], domain: 'livemotionlabs.com' },
});
