# Party camera handoff

Scope: src/cinematic.ts, src/cinematic.test.ts, updateCamera subject framing only in src/renderer.ts, and camera regressions appended to src/cinematic-renderer.test.ts. Existing marker/badge/cache changes and tests were preserved. Branch verified feature/local-multiplayer-formations.

Geometry inspected: src/athletic-figures.ts defines named face at local y=2.77 (all A1/A2/A3), front radius .224; src/scene.ts original face is y=2.11, front radius .3. Contrary to the suspected missing-name cause, both current moulds have a face name. The old anchor used the cranium center, not its visible front surface; unnamed adult fallback was incorrectly y+2.1.

Changes: target the transformed front surface of the actual face sphere, including animated body height/rotation. Missing-name fallback uses mould-specific local height/front depth transformed by the root. Add yaw+.45 radians to the close camera, retaining a front-facing view but leaving the axial kickoff row. No players moved/hidden, assets added, or marker/spacing logic changed. Existing shortest-angle subject blend and wide pullback math remain intact.

Command (run from D:/SloppySoccer/Game):
'C:/Program Files/nodejs/node.exe' node_modules/vitest/vitest.mjs run src/cinematic.test.ts src/cinematic-renderer.test.ts

RED: exit 1, 2 failed / 9 passed (11 tests). Axial view had effectively zero lateral displacement; real face surface did not project to exact center. This is a geometric reproduction, not a new visual confirmation of the parent's noticeably-above-center observation.
GREEN after minimum fix: exit 0, 11 passed. Final expanded preservation coverage: exit 0, 12 passed across 2 files (3 cinematic, 9 renderer).

Regressions cover real adult/original heights, transformed front-surface projection at center, missing-name fallback, front hemisphere and modest lateral angle, kickoff-axis segment clearance at two units (> .8 lateral), shortest-angle continuity, paused camera transforms, finite dimensions, reduced-motion wide mode, exact wide position restoration, and existing marker/badge/cache tests.

Integration assumptions: named face remains a scaled unit sphere facing local +Z; characterId identifies adult moulds for fallback. The unnamed fallback cannot reproduce animated body transforms without an identifiable face node, but avoids the adult-height error. Intro countdown remains caller-frozen on pause. Segment clearance is a focused geometric check, not a proof against every dancing player or formation occlusion.

No full build, browser server, E2E, installs, commits, deployment, tasks, or production operations run. Coordinator still owns real preview3003 visual acceptance of both team shots, dance-time framing and pullback; process exit 0 is not visual/review approval.
