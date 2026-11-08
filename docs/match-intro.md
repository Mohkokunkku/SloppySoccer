# Cinematic handoff

Owned files: src/renderer.ts, src/cinematic.ts, src/cinematic.test.ts, src/cinematic-renderer.test.ts, docs/match-intro.md. No other files edited by this worker.

Implemented engine-countdown-driven home face spotlight, smooth transition to away face spotlight, then 2.5-second smooth lift/pullback to the existing wide camera. Face anchors use actual rig world face height/position and root forward direction. No video/assets/network or simulation writes. Reduced motion is a static wide team reveal. Intro advances presentation locomotion time; paused frames freeze poses. Ready/new match resets presentation time; all non-intro phases restore wide framing.

Human rings and matching seat labels use humanControls, including legacy fallback. All rendered players have role markers, root-following shadows and actual rendered x/z diagnostics; dynamic team/role changes replace/dispose rigs without duplicate IDs, retaining A1 attacker/A3 midfield/A2 defender mapping. Existing projection spacing, board entrance anchor, ball rebasing and static GPU frame caching retained.

Verification (actual focused runs):
- RED: node node_modules/vitest/vitest.mjs run src/cinematic.test.ts — failed missing cinematic module.
- GREEN after implementation: same command — 2 passed.
- RED: node node_modules/vitest/vitest.mjs run src/cinematic-renderer.test.ts — 2 failed (missing cinematic datasets/behavior).
- Additional RED regressions: reused ready did not reset time (1 failed, 3 passed); changing seats produced duplicate ring colors (1 failed, 4 passed). Both fixed and rerun green.
- Final: node node_modules/vitest/vitest.mjs run src/cinematic.test.ts src/cinematic-renderer.test.ts — 2 files passed, 7 tests passed.
- git diff --check on owned source/test paths passed.
Renderer tests use real Three objects and actual render method with mocked poseFigure, DOM marker doubles and a GPU render spy; they are not browser/WebGL or visual validation. No full build/browser suite run while writers active.

Exact remaining integration contracts:
- Engine supplies phase='intro', phaseTimer descending 6.5 to 0, freezes it while paused, keeps kickoff players and centered/unowned ball, and owns introEnabled/skipIntro/action-edge consumption. Renderer does not write these fields.
- Coordinator starts via startGame(state,true,true), passes paused to render, and wires skipIntro and lobby/reset UI. No renderer API change.
- Engine kickoffPosition accepts formations as fifth argument; entry diagnostics pass state.formations. Player tacticalRole metadata must reflect selected formations; renderer consumes both teams and formation changes each frame.
- Dance worker poseFigure cheer argument remains {style,seconds,index}; renderer uses index modulo 5 and follows actual animated root in both planar axes. Goal style still derives from total goals; intro uses first welcome dance.
- Host datasets: introShot='home'|'transition'|'away'|'teams'|'wide'; cameraMode='wide'|'intro'|'intro-pullback'; controlledPlayers JSON seatId->playerId; playerPositions JSON id->{x,z} actual rendered roots; danceStyle numeric zero-based style string. Existing diagnostics retained. Read-only observations, no mutable debug hook.
- Coordinator/QA still need final integrated typecheck/build and real browser verification for ten markers, framing/visual continuity, skip/pause/reset, responsive sizing, four-seat controls and five real dance styles. Unit tests do not claim hardware/controller or GPU validation.
