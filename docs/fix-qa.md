# QA review-fix handoff

Changed only:
- tests/browser/review-fixes.spec.ts
- docs/fix-qa.md

Production regressions (5):
1. READY goal audition cancels on actual alternate-tab visibility hide.
2. READY goal audition cancels on native browser window blur (not labelled visibility hide).
3. Native shot rotation survives a paused geometry rebuild.
4. Early entering fieldHeight increase (End) preserves original tunnel anchor, freezes clock, bounds entry count, and eventually reaches playing.
5. Early entering fieldHeight decrease (Home), same assertions.

Uses real production UI, native keyboard input, DOM diagnostics, alternate browser tabs, and real audio. No engine mutation, fake time, audio substitution, WebGL hooks, or synthetic visibility/blur events. Shot rotation detection and pause happen atomically in the browser. Audio cancellation is continuously checked for a bounded two-second observation window after returning to the original tab, including unchanged playback count. Tab visibility is explicitly asserted; unsupported native hiding fails its prerequisite rather than silently relabelling blur as hidden.

Verified discovery only:
`node node_modules/@playwright/test/cli.js test tests/browser/review-fixes.spec.ts --list`
Exit 0: Total: 5 tests in 1 file. No browser/server execution or build performed.

Focused behavioral RED: NOT RUN.
Focused behavioral GREEN: NOT RUN.
The explicit QA instruction to defer production execution until coordinator rebuild takes precedence over executing RED/GREEN now. No behavioral pass or fix completion is claimed.

Integration requirements:
- Coordinator rebuilds production assets/server after worker integration.
- Renderer exposes data-entry-anchor-height during entering from state.entrance.fieldHeight, including while paused.
- Coordinator executes `node node_modules/@playwright/test/cli.js test tests/browser/review-fixes.spec.ts` against rebuilt production using existing port-4173 configuration; production port 3000 remains untouched.
- Entry browser coverage asserts available bounded count/anchor diagnostics, not per-player displacement (not exposed). Engine-owned tests must establish displacement bounds and no lateral movement before original exit.
- Browser coverage establishes active READY audition cancellation only on hosts capable of native tab focus/visibility transitions. On this runner both headless and headed Chromium continued to report visible/focused after switching tabs; the installed Playwright primary source forces focus emulation. A separate CDP override did not restore native signals. These two prerequisite-dependent cases are explicitly reported as skipped, never as passes. Deterministic active/decode cancellation in every phase remains verified by src/suspension.test.ts, and native source-start/mute/pause behavior is tested elsewhere.
- A standalone fresh Chrome/noDefaults probe was also attempted, but its loopback navigation returned net::ERR_ABORTED; that probe is not evidence of application cancellation success. No fake visibility/blur event is used to replace a native signal. Manual check: on READY or Full time, click Hear goal music, immediately switch away, and confirm the audio stops and does not resume on return.
