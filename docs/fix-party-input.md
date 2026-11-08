# Party input fix handoff

Scope: shared/engine.ts, shared/multiplayer-engine.test.ts, src/local-input-integration.test.ts, this document only. Branch verified feature/local-multiplayer-formations. Existing staged/unrelated edits preserved.

## Change

stepLocalGame(state, inputs, dt, config?, inputMode: 'held' | 'pulses' = 'held') now accepts already-detected events without detecting their rising edge again. stepGame and omitted/explicit held mode retain per-seat held-edge filtering. No action execution, cooldown, pickup-lock, keeper, AI exclusion, ownership or phase logic changed.

## Real verification

Commands executed from D:/SloppySoccer/Game using C:/Program Files/nodejs/node.exe (quoted in bash):

- RED: node_modules/vitest/vitest.mjs run src/local-input-integration.test.ts — exit 1; 3 failed, 1 passed. Adjacent shoot/pass release IDs remained 1 instead of 2; adjacent switchPlayer events left the same player selected. Before the API edit the expected fifth argument also produced a TypeScript diagnostic.
- GREEN: node_modules/vitest/vitest.mjs run src/local-input-integration.test.ts shared/multiplayer-engine.test.ts — exit 0; 2 files, 16 tests passed.
- Regression: node_modules/vitest/vitest.mjs run src/local-input-integration.test.ts shared/multiplayer-engine.test.ts shared/intro-engine.test.ts shared/engine.test.ts shared/engine-tuning.test.ts src/local-input.test.ts src/local-input-queue.test.ts — exit 0; 7 files, 89 tests passed.
- git diff --check -- shared/engine.ts shared/multiplayer-engine.test.ts — exit 0, no output.

The integration uses real LocalInputHub, LocalInputQueue, FixedStepper and engine: a 1/60-second RAF consumes the first event, a 1/240-second release RAF has zero ticks, then a 1/80-second repress RAF consumes the next event on the adjacent tick. Covers shoot, pass, two simultaneous co-op switchPlayer events, no duplicate event on a later held RAF, unique outfield ownership, intro consumption and caller clearing at skip/pause boundaries. Shot/pass fixtures explicitly restore possession to the currently controlled player between events; they test delivery, not natural ball reacquisition or pickup-lock expiry. Direct tests cover legacy/default/explicit held shot suppression and independent per-seat held switches.

## Integration requirements and limits

Client owner must pass fifth argument 'pulses' for hub/queue inputs and consume the queue separately on every fixed tick. A true pulse means a fresh event even if the preceding tick was true. Do not replay one consumed snapshot over catch-up ticks. Movement/sprint remain held.

Intro ticks consume/discard actions as before. For skip before a simulation tick, pause/resume and other input-reset boundaries, caller must clear hub and queue (and reset the stepper as appropriate) so a pending pre-boundary event cannot leak into play. The integration explicitly exercises this contract. Held-mode skip suppression remains engine-owned and existing intro tests passed. Fresh post-skip pulses must not be blocked by held-mode edge history.

Queue booleans coalesce multiple same-action presses before any consumption; this patch fixes adjacent consumed ticks, not counted-event buffering. No main/input/queue edits, full build, browser suite, installs, deployment or physical-controller verification performed. Reconnect behavior was not newly integrated here. Passing process/tests is not independent review approval; coordinator must verify UI wiring and final review.
