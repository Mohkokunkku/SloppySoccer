# Five-a-side tactics handoff

Owned changes only: shared/formations.ts, shared/formations.test.ts, shared/tactics.ts, shared/tactics.test.ts, shared/five-tactics.test.ts, docs/five-tactics.md.

Formation exports are ready: DEFAULT_FORMATIONS:Record<Team,Formation>; sanitizeFormations(unknown):Record<Team,Formation>; formationRole(slot:number,formation:Formation):TacticalRole|null; formationPosition(team:Team,slot:number,receiving:boolean,tuning:Readonly<GameTuning>,formation:Formation):{x:number;y:number}. Both defaults are 2-1-1. Slot3 remains keeper; slot4 is the second defender/midfielder. Positions scale by fieldWidth/32 and fieldHeight/20 and mirror x for away. receiving means this team receives kickoff (attacker -3 rather than -1 normalized). Invalid slots return null role / centered position.

Planner excludes every validated human via controlledPlayerIds, respects tacticalRole metadata, separates duplicate-role support/cover lanes using stable player-ID ordering, selects at most one presser and permits defender pressing only in deep central emergencies. Defender depth constraints exclude other defenders, avoiding order-dependent cascading retreat. Planner remains pure; arrival deadzones, legacy role fallbacks and tuned-field normalization remain intact. Legacy tactics regressions explicitly keep three-outfielder fixtures; new tests use engine-independent ten-player fixtures.

Actual TDD runs:
- node node_modules/vitest/vitest.mjs run shared/formations.test.ts
  RED: missing formations module (1 suite failed, no tests collected).
  GREEN after implementation: 1 file, 5 tests passed.
- node node_modules/vitest/vitest.mjs run shared/five-tactics.test.ts
  RED: 8 tests failed (human exclusions, duplicate lanes, keeper-ID fallback).
- node node_modules/vitest/vitest.mjs run shared/formations.test.ts shared/five-tactics.test.ts shared/tactics.test.ts
  GREEN after implementation: 3 files, 27 tests passed.
  Final GREEN with added scaling/mirroring/settling checks: 3 files, 29 tests passed.
- git diff --check -- shared/formations.ts shared/formations.test.ts shared/tactics.ts shared/tactics.test.ts shared/five-tactics.test.ts
  Passed, no output.

Remaining integration contracts:
- Engine creates slots0..4 for both teams and assigns tacticalRole from formationRole; especially slot4 in 1-2-1 needs explicit midfielder metadata (metadata-free fallback is default defender).
- Engine calls formationPosition with receivingTeam === team and live tuning for initial/goal kickoff; preserve existing kickoffPosition fourth tuning argument and add formations as fifth argument.
- Engine maintains controls bindings and excludes all controlledPlayerIds from movement AND AI actions; planner exclusion does not replace engine action exclusion. Explicit controls:[] means no humans; absent controls uses legacy controlledId fallback.
- Coordinator wires sanitized formation choices into MatchConfig/GameState. No shared types, engine, UI, dependencies or configuration edited here.
- Full typecheck/build/browser/integration verification is coordinator-owned after parallel writers finish; none run by this worker. No commits, pushes or deployment.
