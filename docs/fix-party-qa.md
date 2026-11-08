# Bounded party QA fixes

Scope: only the six assigned browser TypeScript files and this handoff. Branch verified feature/local-multiplayer-formations. Existing ten-marker/slot-3 keeper changes and early-entry intro completion condition preserved. local-party.spec.ts and all source/config files untouched.

## Changes

- party-helpers.ts waits for entrance to reach intro OR playing, clicks the real #skip-intro only in intro, then requires actual playing state. Legacy game/squad/tuning/review match-start paths use it. Natural cinematic coverage in local-party.spec.ts is unchanged.
- main-party-regression.spec.ts adds four tests: 60-second hard settings across toolbar and paused restart; setup select keyboard isolation; held-switch clearing across pause/resume and Change players/new start, followed by a fresh switch proving input still works.
- Existing real-backend full-time test now selects Hard and checks the rematch clock is 1:00 before skipping intro, retaining exactly-once POST and persisted-duration assertions.
- No timeout was increased and no assertion removed. No engine hooks, fake time, routes, WebGL or controller doubles added.

## Actual commands/results

`git status --short; git branch --show-current`: exit 0; expected branch; existing staged/unstaged changes preserved.

`'C:/Program Files/nodejs/node.exe' node_modules/@playwright/test/cli.js test tests/browser/game.spec.ts tests/browser/squad.spec.ts tests/browser/tuning-presentation.spec.ts tests/browser/review-fixes.spec.ts tests/browser/main-party-regression.spec.ts --list`

Exit 0: 29 tests in 5 files (game 8, squad 3, tuning 9, review 5, new regression 4). This is discovery, NOT 29 passing tests.

`git diff --check -- tests/browser/game.spec.ts tests/browser/squad.spec.ts tests/browser/tuning-presentation.spec.ts tests/browser/review-fixes.spec.ts tests/browser/main-party-regression.spec.ts tests/browser/party-helpers.ts`: exit 0, no output.

Behavioral RED/GREEN: NOT RUN. User's explicit discovery-only restriction while source writers are active prevents exact browser reproduction and runtime verification. Strict runtime TDD is therefore incomplete, not claimed. No browser server, build, E2E run, install, production process operation, commit/push/deploy or hardware validation performed.

## Diagnosis: observed failures versus source-supported hypotheses

Baseline GitHub log reports Full time still In play after 130s, demo still goal after 7s, squad test exhausted its 35s total budget while checking away-1 count. That last locator is where the budget expired; it does NOT establish that away-1 was missing.

src/loop.ts:6 caps each animation delta at 0.1 seconds, with at most six 1/60 steps. src/main.ts uses that stepper inside ToyRenderer's animation loop; src/celebration-demo.ts:22 uses the same stepper. src/renderer.ts start delegates to WebGL setAnimationLoop. Thus rendering frames slower than 10 Hz discards wall time, slowing both the match clock and goal countdown. Goal/reset/entrance phases also return before normal play progression in shared/engine.ts. These are concrete source mechanisms consistent with both timer failures, NOT measured proof of CI frame cadence. SwiftShader is explicitly enabled in playwright.config.ts; software-rendering overhead is a hypothesis requiring traces. Source remains other owners' responsibility.

Squad checks involve many sequential browser round trips plus canvas work/entrance under a shared 35s test budget. Intro adds 6.5 simulation seconds on this branch. Skipping through the production button removes that irrelevant cinematic wait, but cannot establish a fix for the older main baseline slowdown. Keep existing budgets pending evidence; do not replace rendering or merely extend all waits.

## Coordinator: tight post-freeze reproduction

After compiling current production assets/server once, run the new file alone first:

`node node_modules/@playwright/test/cli.js test tests/browser/main-party-regression.spec.ts --workers=1 --trace=on`

Against the reviewed disabled-FormData implementation, toolbar/paused restart should reveal 2:00 instead of 1:00. Source UI owner must supply the fix, then rerun unchanged tests GREEN. Run `game.spec.ts --grep 'complete one-minute'` separately to cover Play again after a real finished match; preserve backend save checks. Capture RED and GREEN output rather than infer them from discovery.

For baseline synchronization: run `game.spec.ts --grep 'complete one-minute|rehearses all three' --workers=1 --trace=on`, then `squad.spec.ts --grep 'remains startable' --workers=1 --trace=on` separately. Inspect traces for clock/countdown progression, pause/visibility state, phase transitions and time consumed before each marker check. If needed, use read-only browser RAF sampling to record real wall-time frame intervals alongside #clock and #demo-status text, without modifying clocks/engine. Compare solo runs to the configured serial suite before changing budgets or source timing policy. Reproduction of old main requires coordinator-managed isolated assets/worktree; do not switch this active shared branch.

## Integration assumptions and limits

- Production IDs, phases and #skip-intro follow the contract. data-controlled-players is stable JSON seat-to-player diagnostics; unchanged bindings are compared verbatim. Setup select keys must remain native and not leak to gameplay.
- Restart clock assertions sample entrance while clock is frozen; helpers keep the existing 30s entrance budget. The held-switch observation is 500ms of real time, not a fake timer.
- The 1:00 restart/rematch clock assertion directly detects the reviewed duration reset. Checked Hard radio assertions verify the UI choice, NOT actual hidden engine difficulty: the reviewed bug itself leaves Hard checked. There is no public config diagnostic/API proving active difficulty, and source hooks were forbidden. Coordinator should pair this with source-owner config lifecycle tests (or agree on a read-only active-config diagnostic) before claiming difficulty behavior verified.
- All five demo dances/natural cinematic verification remain independent new-feature QA coverage; this legacy suite still checks its original three dance transitions without weakened assertions.
- Discovery exit 0 is not review approval. Runtime/browser, visual quality, physical Sony controller support and deployment acceptance remain unverified.
