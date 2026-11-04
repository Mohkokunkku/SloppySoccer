# Mechanics live tuning handoff

Owned implementation: shared/engine.ts and shared/tactics.ts.
Owned regressions: shared/movement.test.ts, shared/entrance.test.ts, shared/engine-tuning.test.ts.

Playing movement approaches desired planar velocity with a vector acceleration cap. Facing follows the shortest angular difference with a turnRate cap; keepers face their attack direction with the same bound. Pitch contact cancels blocked velocity components. Sprint and AI speeds derive from runSpeed. Shot, pass and elevated keeper clearances use their respective tuning powers. Keeper protection, pickup locks and action cooldowns are retained.

Kickoff coordinates scale independently with field dimensions. Tactical decisions normalize into the original formation coordinate system, then scale and radius-clamp targets back to the live field. Tactical cache keys include all tuning values. Ball boards, goal mouth/height, scoring, keeper box and dribbling read live dimensions; FIELD is not mutated.

startGame(state) remains immediate. startGame(state,true) places both four-person queues at x=-2/+2, y=fieldHeight/2+2+slot*.6. Entering and resetting use direct straight paths capped at 7 units/sec, without pitch clamping, contests or scoring. Live geometry changes retarget remaining paths without teleporting players. Both phases freeze elapsed and match time and consume action edges. The coordinator added an accelerated entrance ramp and a straight exit waypoint at fieldHeight/2+0.5 before fanning out, verified by shared/entrance-route.test.ts; this avoids cutting through doorway walls. Completion restores facing, stops all velocities and starts the receiving kickoff (home for entrance). Simulation pause remains caller-owned: do not step while paused.

TDD execution: movement and entrance initially failed (2 failed tests); tuning regressions initially failed (2 failed tests). Targeted command:

    node node_modules/vitest/vitest.mjs run shared/movement.test.ts shared/entrance.test.ts shared/engine-tuning.test.ts

Final execution: 3 test files passed, 6 tests passed, duration 421ms. Additional passing characterization coverage exercises both keepers with live clearance power and a complete live-geometry goal/reset cycle. git diff --check on all six owned paths exited 0.

Integration: the two obsolete instant-turn/instant-velocity assertions were observed failing and updated by the coordinator to require bounded turning and velocity changes. The control-handoff regression now additionally compares the selected defender against an isolated-player simulation to prove no AI steering is applied after selection.
