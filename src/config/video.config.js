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
  weight: { light: 300, regular: 400, medium: 500, semibold: 600 },
  /** Pixel sizes in the 1920x1080 layout. */
  size: { display: 128, headline: 76, title: 44, body: 26, caption: 30, label: 16 },
  tracking: { display: '-0.045em', headline: '-0.035em', label: '0.16em' },
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
  exit: 0.4,
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
      speak: 'It finds the beat, the rhythm, the lows, the mids, the vocals, and the instrumentals.',
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
 * Drum pattern sections on a 16-step bar grid. `from` and `to` are seconds on the timeline.
 * The soundtrack and the on-screen pulses both read the kick list, so they cannot drift apart.
 * @type {Readonly<Record<string, readonly {from: number, to: number, steps: readonly number[]}[]>>}
 */
export const DRUMS = Object.freeze({
  kick: [
    { from: 1.5, to: 3, steps: [0, 4, 8, 12] },
    { from: 8, to: 56, steps: [0, 4, 8, 12] },
  ],
});

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
  },
  choose: {
    experience: {
      label: 'Experience',
      items: ['Experience 01', 'Experience 02', 'Experience 03', 'Experience 04'],
      looks: ['contours', 'rings', 'bars', 'shards'],
    },
    backdrop: { label: 'Backdrop', items: ['Plain', 'Grid', 'Glow'] },
    captions: { label: 'Captions', items: ['Minimal', 'Bold', 'Outline'], sample: 'Hold the night' },
  },
  quality: { live: 'Live', gpu: 'GPU', chips: ['Premium quality', 'Real time', 'GPU'] },
  lab: { title: 'Self-serve lab', rows: ['Self-serve', 'Subscription'], pill: 'Early access open' },
  cta: { headline: ['Join', 'early', 'access'], domain: 'livemotionlabs.com' },
});
