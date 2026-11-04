# Entry fix handoff

Changed files: shared/engine.ts, shared/tuning.ts, shared/entrance-route.test.ts, docs/fix-entry.md. Existing shared/entrance.test.ts and other regressions were not changed.

Engine snapshots entrance.fieldHeight and entrance.exitY when startGame(state, true) begins and records doorway completion per player in entrance.completed. Unfinished players move straight to the original exit; completed players target live kickoff geometry without re-entering the doorway stage. Metadata is deleted at kickoff. Existing startGame(state) compatibility, frozen entrance clocks/score, consumed input edges and bounded movement are preserved. Tuning continues to avoid clamping entrance players; its comment now describes the anchored route.

Strict TDD results:
- RED: node node_modules/vitest/vitest.mjs run shared/entrance-route.test.ts — exit 1; 1 file failed, 7 tests failed and 1 passed. Observed premature lateral movement with height 30 at frame 0, plus missing entrance metadata assertions.
- GREEN: node node_modules/vitest/vitest.mjs run shared/entrance-route.test.ts shared/entrance.test.ts shared/engine-tuning.test.ts shared/tuning.test.ts shared/engine.test.ts — exit 0; 5 files passed, 74 tests passed; duration 1.01s.

New regressions cover increasing/decreasing height to 30/12 at frames 0, 20 and 60 (early entry, doorway passage and fanning out), no tuning teleport, no lateral movement before original exit, explicit completion tracking, steps <= 7/60, frozen score/clock, eventual live kickoff positions, metadata cleanup and held input edges. A separate test checks a nondefault initial height of 30.

Coordinator integration: scene/tunnel and camera now use state.entrance.fieldHeight until kickoff, including geometry rebuilds, and expose data-entry-anchor-height. A temporary supporting plinth retains the original deck footprint when the pitch shrinks, while the pitch/goal dimensions remain live. src/entry-visuals.test.ts and the renderer regression were observed RED then GREEN; the combined npm run check passed 251 tests across 38 files and strict builds. This handoff's focused-worker counts remain historical evidence above. Final production-browser gates are recorded in docs/verification.md.
