# Live Motion Labs launch film

A 58-second, 4K, 60 fps product film for [livemotionlabs.com](https://livemotionlabs.com), built entirely
in code. Every frame is a seek into one paused GSAP master timeline, so any frame renders exactly and
repeatably. The soundtrack, sound effects and mix are synthesised in JavaScript. The narration is
generated with an open text-to-speech model.

> **Not generative AI.** The picture is hand-written procedural animation (rules and math). The film
> makes no claim beyond the approved list, and the app is not launched: only early access is open.

## Quick start

Requires Node 22+, ffmpeg, and a Chromium that Playwright can find (`npx playwright install chromium`).

```bash
npm ci
npm run check      # lint + type check + tests; must pass with zero errors and zero warnings
npm run render     # audio -> 4K frames -> MP4 -> verification, written to dist/
```

Render on a machine with a GPU for speed:

```bash
npm run render -- --gpu                 # uses full Chromium with GPU rasterisation
npm run render -- --gpu --angle metal   # macOS; use d3d11 on Windows, vulkan or gl on Linux
npm run render -- --workers 3           # parallel browsers (default: up to 4)
```

Frames are written to `build/frames` and a render can be resumed: existing frames are skipped.
Delete the folder to start over. A full CPU render takes about 35 minutes on 4 cores.

Other commands:

| Command                     | What it does                                                              |
| --------------------------- | ------------------------------------------------------------------------- |
| `npm run preview`           | Serves the film; open the printed URL. The audio is the clock.            |
| `npm run shots -- 5.8 26.5` | Renders single frames at those times to `build/review/` for checking.     |
| `npm run audio`             | Builds the soundtrack, effects, narration mix and master (cached).        |
| `npm run encode`            | Encodes existing frames plus audio to `dist/`.                            |
| `npm run verify`            | Checks the MP4: 4K, frame rate, frame count, audio/video length, bitrate. |
| `node scripts/qa-gaps.js`   | Finds moments with almost nothing on screen.                              |

## How it is built

```
src/config/video.config.js   ALL text, timings, colours, fonts, cues, score and sound effects
src/core/                    pure, tested maths: frames, beats, easing, noise, cues, captions
src/web/                     the film: GSAP master timeline, scenes, canvas drawing, captions
src/audio/                   DSP toolkit, instruments, music, sound effects, voice chain, mix
scripts/                     render, encode, verify, audio build, voiceover generation
tests/                       unit, audio, output-verification and browser smoke tests
assets/                      Geist font (OFL), generated narration clips and their timing manifest
```

**One clock.** `film.seek(t)` moves the master timeline to `t` and redraws the canvas layers.
Rendering calls it with `frame / fps`; the preview calls it with `audio.currentTime`. Captions, visuals
and sound effects all read the same cue times, so they cannot drift apart.

**Sync by construction.** The narration is generated one line at a time with a Kokoro model that
reports per-phoneme timing. Word start times drive on-screen reveals, caption highlights and sound
effects through named cues in the config. The on-screen pulses and the drum track read the same kick
list.

**Determinism.** No `Math.random` or clocks anywhere in the film (enforced by lint). Randomness comes
from a seeded generator, and a smoke test proves a frame is pixel-identical however the playhead got there.

## Editing the film

Everything you would want to change lives in `src/config/video.config.js`:

- **Copy and captions:** `VOICEOVER.lines` (spoken text, caption text, start time) and `COPY`.
- **Timing:** `SCENES` (cuts sit on the 120 BPM beat grid), `CUES`, `DRUMS`, `SFX`.
- **Look:** `PALETTE` (one dark base, one accent, grays), `TYPE` (one family), `MOTION` (easing and durations).
- **Format:** `VIDEO` (`fps`, `duration`, seed). Use `fps: 30` for faster renders.

After changing narration text, regenerate it, then check it is intelligible:

```bash
npm run tts:setup    # one time: Python venv, Kokoro-82M (Apache-2.0), Whisper for checking
npm run tts          # writes assets/audio/vo/*.wav and manifest.json (with word timings)
npm run tts:verify   # Whisper transcribes every clip and compares it to the script
```

Then retime the lines in the config (a test fails if a line overlaps another or leaves its scene).

## Using real product footage

The repository contains no Live Motion Labs engine, so the previews in this film (the contour field, rings,
bars, shards, lyric frame and camera flight) are **illustrative procedural visuals made for this film**, and
the film says so on screen. To show real output instead, render clips with the engine and replace the
canvas inside `canvasCard` (see `src/web/components.js`) with a `<video>` element seeked from the same clock.

## Licences

- Code: MIT (see `LICENSE`).
- GSAP: free for commercial use under the GSAP standard licence.
- Geist typeface: SIL Open Font License 1.1 (`assets/fonts/OFL-LICENSE.txt`).
- Kokoro-82M voice model: Apache-2.0. Whisper (checking only): MIT.
- Music, sound effects and visuals are generated by this repository's code.
