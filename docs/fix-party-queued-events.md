# Queued poll events handoff

Scope: src/local-input-queue.ts, src/local-input-queue.test.ts, src/local-input-integration.test.ts and this document only. Branch verified: feature/local-multiplayer-formations. Existing staged work preserved.

Changed boolean OR coalescing to per-seat FIFO action groups. Each action-bearing push snapshots its simultaneous flags; consume removes at most one group per seat. Latest polled movement/sprint apply even to older queued actions. Empty polls update held state without inserting action delays. No second edge filter, cross-poll merging, queue cap or silent dropping. clear removes all held state and backlog; caller objects are not mutated.

Strict TDD command, run before and after the implementation:

    'C:/Program Files/nodejs/node.exe' node_modules/vitest/vitest.mjs run src/local-input-queue.test.ts src/local-input-integration.test.ts

RED: exit 1; 2 files failed; 4 failed, 8 passed (12 total). Exact failures: second pre-consume switch lost in queue and real-engine co-op integration; later shoot merged into earlier pass in queue and real-engine ordering integration.
GREEN: exit 0; 2 files passed; 12 tests passed. Queue: 6 tests. Integration: 6 tests (including parameterized shoot/pass cases). Also ran git diff --check -- src/local-input-queue.ts src/local-input-queue.test.ts src/local-input-integration.test.ts; exit 0, no diagnostics.

Integration uses actual LocalInputHub, FixedStepper and stepLocalGame(..., {}, 'pulses'). Four 1/240-second RAF polls precede the first 1/60-second tick; two separated switch presses survive independently while a second co-op seat switches once. Pass from an earlier poll executes before shoot from a later poll. The ordering fixture explicitly restores possession between actions to isolate delivery from ball travel/pickup timing, not to simulate a natural possession sequence.

Assumptions: hub supplies already-discrete per-RAF pulses, with bounded groups per actual poll; caller consumes once per fixed tick and clears queue/hub/stepper at lifecycle boundaries. Simultaneous flags remain one group for existing engine precedence. Ordering is per seat, not a global cross-seat timeline. Scope does not recover physical transitions never sampled by the hub. Missing seats retain prior held state until updated or cleared, preserving the API behavior. No main/engine/hub edits, dependency changes, full builds, browser suites, commits, pushes or deployments performed. Focused exit 0 is not review approval; broader integration and physical-controller verification remain coordinator responsibilities.
