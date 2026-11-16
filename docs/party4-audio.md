# Party 4 audio handoff

Scope: audio-only worker changes; renderer, coordinator, and instrumental music source files were not changed.

- All three active winner-cheer paths retain their legacy filenames but are now real CC0 human recordings: `public/audio-v3/cheer-yeah.wav` says “You win!” (Jeffrey M. Smith); `cheer-we-did-it.wav` says “Congratulations!” (Giselle); `cheer-champions.wav` says “You win!” (Giselle). The coordinator replaced the specialist's initial mission-completed choice with a football-appropriate positive cue. Metadata does not claim the historical filename phrases.
- `src/human-shouts.ts` is the explicit catalog used by `src/audio.ts` for pass/here cues and all party cheers. The existing v2 files stay at their original paths; `voice-yes.wav` honestly says “Hurry up!”, not “Yes”.
- Human source files are Kenney Voiceover Pack recordings; the archived `License.txt` specifies CC0 and `Credits.txt` identifies performers. Source archive remains unshipped under ignored `.local-server/audio-sources`. `public/audio-v3/CREDITS.md` and `manifest.json` provide provenance and measured WAV metrics/hash.
- `scripts/generate-victory-audio.py` now generates instrumental loops only. `scripts/prepare-human-shouts.py` is the explicit FFmpeg conversion/measurement utility for all five recorded source clips. The coordinator also replaced earlier EQ/normalization of the two v2 voices with direct source conversions. All vocal URLs carry `?v=human-v1` so an old cached TTS file cannot survive the update.
- No speech synthesis, voice cloning, synthetic replacement, or pitch shifting is used. Audio was decoded/measured, not headphone-listened; coordinator can audition `public/audio-v3/cheer-yeah.wav`, `public/audio-v3/cheer-we-did-it.wav`, and `public/audio-v3/cheer-champions.wav`.

Focused TDD: `src/human-shouts.test.ts` first failed RED because `./human-shouts` did not exist; after implementing catalog and runtime routing it passed. Verification command:

`python .local-server/capture-node.py node_modules/vitest/vitest.mjs run src/human-shouts.test.ts src/audio-runtime.test.ts src/post-match-audio.test.ts src/post-match-ducking.test.ts`

Result: 4 test files, 13 tests passed, including runtime assertions for all three rotating winner-clip paths. `python scripts/prepare-human-shouts.py` completed and regenerated a manifest measuring all six v3 WAVs; FFmpeg decoded all three replacement cheer WAVs successfully. No full build, browser run, install, or listening claim.

Coordinator verification additionally compared the decoded PCM of every shipped vocal WAV against a fresh direct conversion of its archived human source: all five were byte-identical. All were non-silent and unclipped. Native browser decoding/playback and cache-versioned request paths passed. Final suite counts are recorded in `party4-verification.md`; proof with source names, actual words, performers, durations, peaks and SHA256 is retained in `.local-server/verification/party4/human-recordings-proof.json`. No headphone/speaker listening claim is made.
