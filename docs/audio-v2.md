# Audio v2 handoff

Runtime implemented in src/audio.ts; event policy in src/audio-events.ts.

Audio remains opt-in and initially disabled. Call setEnabled/unlock from a user gesture. Samples are fetched lazily, decoded once per context and mixed with individual gains. No HTMLAudio voice playback, oscillator kick, synthetic speech, external service or credentials are used.

Expected coordinator-provided assets (not created or modified by the audio worker):

| Path | Content | Gain |
| --- | --- | --- |
| /audio-v2/kick.wav | Real recorded impact | .55 |
| /audio-v2/voice-go.wav | Human saying Go | .60 |
| /audio-v2/voice-yes.wav | Human saying Hurry up! (internal legacy cue filename) | .60 |
| /audio-v2/crowd-shot.wav | Short human audience shot reaction | .38 |
| /audio-v2/crowd-goal.wav | Larger human goal celebration | .65 |
| /audio-v2/goal-music.wav | Original energetic approximately four-second instrumental | .42 |

The retained pass-me/here event identifiers map to the recorded “Go!” / “Hurry up!” support cues. Goal triggers both celebration and music. Instrumental music is synthesized, not human-recorded. Coordinator supplied all six measured, licensed assets; provenance and changes are recorded in public/audio-v2/CREDITS.md and visible in the game’s Audio credits disclosure. No paid services or audio credentials were used.

At most six samples play simultaneously; oldest voices are stopped when necessary. At most twelve pending playback requests are accepted. quiet increments a generation token, cancels all active nodes and invalidates pending resume/fetch/decode work. reset, mute and dispose use this cancellation path. Pending network/decode work can finish to populate cache but cannot emit stale playback. readonly activeCount/pendingCount report current-generation playback diagnostics. played counts successfully started sample nodes, including both goal layers.

Coordinator integration: invoke quiet on pause and visibility hide, reset on restart; do not call update while paused/hidden. Runtime cannot infer browser pause state from GameState, which has no paused phase. User gesture unlock remains required by browser policy.

Shot crowd policy uses the engine’s monotonic ball.release tag (shot/pass/clearance plus source player) and an opposing-goal trajectory check. Equal shot/pass power therefore remains unambiguous in the actual game; the independent src/shot-events-integration.test.ts reproduces that failure first and verifies the fix using real engine actions. Legacy fixtures without tags retain conservative velocity inference. Keeper releases and passes do not trigger crowd-shot. Cooldown is two simulation seconds; support-call pacing remains eight seconds, and final-tick scores still emit a goal event.

Verification (owned tests only):

- RED event regression: 2 failed, 4 passed.
- RED runtime regression: 6 failed, 6 passed across both files.
- Final command: node node_modules/vitest/vitest.mjs run src/audio-events.test.ts src/audio-runtime.test.ts
- Final result: 2 test files passed; 13 tests passed; exit 0.
- Tests use Web Audio/fetch doubles, covering sample paths, opt-in, goal layers, polyphony, missing samples, cancellation across decode/resume/demo, muted/reset/disposed cancellation, tuned geometry/speeds, cooldown, keeper/pass rejection and existing event behavior.
- Full builds, production/browser playback and actual asset validation are coordinator-owned and were not run.
