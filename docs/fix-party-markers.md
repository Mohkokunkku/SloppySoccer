# Party marker fix handoff

Scope: src/renderer.ts, src/cinematic-renderer.test.ts, this document only. Branch verified as feature/local-multiplayer-formations. Existing staged/unrelated changes preserved; no commit, install, build, browser suite or deployment performed.

Fix: retain exact A/M/D/GK role-marker text and existing data-role/data-seat, accessible role labels and controlled colors. Separate .seat-badge spans are siblings under .role-markers, keyed/reused by seat ID. Each shows the uppercase seat identifier, exposes data-seat/data-player and an accessible team/seat/role label, and matches the selection ring color. Inline badge styling avoids edits to CSS. Badges use the existing actual-root camera-projected role-marker transform plus a fixed -26px vertical badge offset. Role projection, role spacing and visibility are unchanged; no decluttering algorithm added.

Lifecycle: badges survive repeated renders, ready/restart and rig replacement; switching updates the same badge's player/projection. Missing seats or players remove badges; dispose removes all badge nodes and clears their map. No changes to intro, frozen pose, ball orientation or GPU cache code.

Strict TDD command (Windows bash, project working directory):
'C:/Program Files/nodejs/node.exe' node_modules/vitest/vitest.mjs run src/cinematic-renderer.test.ts

RED: exit 1; 7 tests, 5 passed / 2 failed. Exact symptom reproduced: expected plain role regex but received "A · P1". Lifecycle regression also failed because no badge existed.
GREEN: same command, exit 0; 1 test file passed, 7 tests passed. Final rerun after adding switching assertions also passed 7/7. Existing intro/pause/cache/rig/color tests remain passing. New checks cover ten plain markers, four distinct sibling badges, ring colors, accessible labels, projected transforms, repeated rendering/restart, rig replacement, switching, seat/player removal and disposal.
Additional command: git diff --check -- src/renderer.ts src/cinematic-renderer.test.ts (exit 0, no output).

Integration assumptions/limits: humanControls supplies unique valid seats/player assignments (existing shared contract), and seat colors continue following current controls array order exactly as rings do. Badge positioning inherits current marker projection and container clipping, intentionally without overlap avoidance. Tests use lightweight DOM and pose doubles with real Three.js projection; they do not establish browser visual acceptance or physical controller behavior. Coordinator owns real-browser validation and integration approval. Process exit 0 is not review approval.
