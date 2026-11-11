# Party 2 audio handoff

Implemented audio-owned files: `src/audio.ts`, `src/post-match-audio.test.ts`, `public/audio-v3/` assets/credits, and `scripts/generate-victory-audio.py`.

`GameAudio.updatePostMatch(view: PostMatchView|null)` imports `PostMatchView` as a type from `src/post-match.ts`. It starts one looping theme for each active party ID, ignores repeated frames for the same ID, and selects one of three cheers for a non-draw winner. Draws have neutral instrumental music but no winner chant. `quiet()` invalidates pending work and stops active audio, clearing party identity so a later active view can resume. The existing opt-in, gesture unlock, generation cancellation, six-active/twelve-pending bounds, and audio-v2 playback paths remain.

The three original instrumental loops and three generated spoken cheers are real, non-silent mono PCM WAVs under `public/audio-v3/`. They were generated on this Windows host using the standard-library synthesis and Windows System.Speech. TTS is explicitly not human-recorded. Attribution and regeneration information is in `public/audio-v3/CREDITS.md`. The speech voice is host-dependent. No commercial song/melody, downloads, dependencies, browser oscillator, or browser speech fallback is used.

Verification:
- Strict TDD RED: `python .local-server/quiet-node.py node_modules/vitest/vitest.mjs run src/post-match-audio.test.ts` — 1 file failed, 2 tests failed because `updatePostMatch` was absent.
- GREEN/final focused run: `python .local-server/quiet-node.py node_modules/vitest/vitest.mjs run src/post-match-audio.test.ts src/audio-events.test.ts src/audio-runtime.test.ts` — 3 files passed, 15 tests passed.
- WAV validation: Python `wave` parsed all six files; each is mono, 22050 Hz, has frames, and has nonzero sample bytes. Instrumental lengths are 176400 frames; speech lengths are 26668, 31076, and 44856 frames.
- The coordinator subsequently completed integration, passed strict builds, decoded all six assets with a real browser AudioContext, and exercised native playback/mute/pause/skip for the three themes. See `party2-verification.md` for final acceptance results. No speaker/headphone listening proof is claimed.

One cheer is scheduled at party start; later segment changes do not cue additional cheers. Music ducks under an active cheer regardless of which asynchronous decode completes first, then restores on the voice's real ended event. An explicit reversed-decode regression covers that race. Speech is synthesized, not a recording of people yelling; the supplied phrases are generic spoken wording, not the commercial song.
