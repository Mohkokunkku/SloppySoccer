# Final observed-input contract handoff

Scope: src/local-input.ts, src/local-input.test.ts, src/local-input-queue.ts, src/local-input-queue.test.ts, src/local-input-integration.test.ts; src/main.ts only changes the poll-to-queue call to pass polled.actionGroups. No engine, shared types, phase-step implementation, dependencies, deployment or Git writes.

Keyboard/touch callbacks now append ordered source-kind/code events before poll, retaining repeated taps and mixed action chronology. poll returns per-seat ActionGroup arrays plus legacy boolean summaries. Events map through normalized current unique seats and keyboard layouts; touch supplements only the first seat using legacy touch codes. clear/setSeats discard pending events and retain existing held suppression/lost-keyup recovery. Movement/sprint remain held state. Disconnected/unsupported pad handling remains unchanged, including ignoring touch on those unavailable pad seats.

Queue explicit groups replace (never supplement) summary actions; omitted groups retain legacy behavior. Queue snapshots groups, consumes one per seat per fixed tick, and uses latest held movement. Main passes explicit groups. Existing stepQueuedGame phase-transition backlog clearing and its tests are unchanged.

Evidence (actual local commands, branch feature/local-multiplayer-formations):

RED:
'C:/Program Files/nodejs/node.exe' node_modules/vitest/vitest.mjs run src/local-input-integration.test.ts
Result: exit 1; 3 failed, 6 passed (9). Two pre-poll keyboard taps per independent seat lost the second switch (home-1 unchanged). Keyboard and touch pre-poll pass-then-shot both produced shot instead of pass.

GREEN, final:
'C:/Program Files/nodejs/node.exe' node_modules/vitest/vitest.mjs run src/local-input.test.ts src/local-input-queue.test.ts src/local-input-integration.test.ts src/queued-game-step.test.ts
Result: exit 0; 4 files passed, 29 tests passed. Includes real hub + queue + FixedStepper + engine tests for pre-poll double switches on independent opposing seats, keyboard/touch pass-before-shot, previous between-poll/co-op delivery, and existing phase-step boundaries. Additional hub/queue checks cover mixed source chronology, held repeats, clear/setSeats discard, explicit-empty groups, snapshots and exactly-once sampled pad groups.

'C:/Program Files/nodejs/node.exe' node_modules/typescript/bin/tsc --noEmit
Result: exit 0, no diagnostics.

git diff --check -- src/local-input.ts src/local-input.test.ts src/local-input-queue.ts src/local-input-queue.test.ts src/local-input-integration.test.ts src/main.ts
Result: exit 0, no whitespace errors.

An intermediate added boundary test used invalid seat id 'new', which normalizeSeats correctly rejected; corrected the test fixture to valid p3, without changing normalization.

Integration assumptions/limits: Engine receives pulse mode through existing fixed-step callers. Release-order tests restore possession between ticks to isolate input delivery from travel/pickup timing; they do not fake the engine. Standard-pad buttons remain sampled: one simultaneous group is appended after observed callback events at poll time, without claiming physical chronology or recovery of transitions between samples. Pad checks use injectable unit doubles, not physical hardware validation. No full builds/browser suites were run while parallel writers were active. Passing commands are evidence, not review approval.
