# Visibility fix handoff

Files changed (visibility ownership only):
- src/main.ts: import and call suspendGame from the existing blur/hidden-visibility suspension path.
- src/suspension.ts: unconditionally quiet audio before clearing input and requesting the existing phase-dependent pause, without moving focus.
- src/suspension.test.ts: 12 regressions using actual GameAudio with stubbed browser AudioContext/fetch boundaries. Covers active goal audition sources and deferred decode cancellation in ready, finished, entering, playing, goal and resetting; verifies no delayed playback and unchanged ready/finished pause policy.
- docs/fix-visibility.md: this handoff.

Strict TDD results:
- RED: node node_modules/vitest/vitest.mjs run src/suspension.test.ts
  Exit 1; 1 test file failed; 8 failed, 4 passed (12). Active sources remained 2 before pause handling in all six phases; pending sources remained 2 in ready/finished.
- Minimal fix: add unconditional audio.quiet() to the tested suspension helper and wire main's existing suspend function to it.
- GREEN: node node_modules/vitest/vitest.mjs run src/suspension.test.ts src/audio-runtime.test.ts
  2 test files passed; 19 tests passed (19), duration 1.99s. Existing audio-runtime tests were run read-only.
- Inspected src/main.ts diff: only helper import and suspend delegation added relative to the existing staged version. The subsequent git diff --no-index returned 1 because the new helper differs from /dev/null; this was not a test failure.

Integration remaining: architect runs full integration/typecheck/build and production browser verification, including actual visibility hiding. No full builds/browser suites, installs, config changes, commits, deployments or production port operations performed. No shared interface changes required. Existing phase/input policy, setup, saving, tuning UI and credits remain untouched.
