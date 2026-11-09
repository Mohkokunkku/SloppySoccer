# Five-player engine handoff

Files changed: shared/engine.ts, shared/engine.test.ts, shared/multiplayer-engine.test.ts, shared/intro-engine.test.ts, shared/entrance-route.test.ts, shared/engine-tuning.test.ts. Existing shared/entrance.test.ts verified unchanged.

Implemented ten players, formation-based creation/reset, keeper IDs home-3/away-3, independent seat movement/action edges and collision-free own-team switches, human-safe passing and AI exclusions. Difficulty is symmetric with humans on both teams; otherwise friendly bots follow the human team, including away-only play. Existing physics, releases, five-second goals, bounded reset and entrance anchors remain covered.

Exports: stepLocalGame(state, inputsBySeatId, dt, config?), legacy stepGame(state,input,dt,config?), startGame(state,withEntrance=false,withIntro=false), INTRO_SECONDS=6.5, skipIntro(state). kickoffPosition keeps tuning fourth and optional formations fifth. Intro freezes match clocks/players/ball and consumes seat actions; skipping also suppresses held actions before the first intro tick. Entrance metadata clears on intro/kickoff. Local control bindings survive kickoff; controlledId aliases the first valid human. Legacy fixtures without controls still use p1 and controlledId.

Actual focused TDD:
- node node_modules/vitest/vitest.mjs run shared/multiplayer-engine.test.ts shared/intro-engine.test.ts
  Initial RED: 8 failed (missing exports, eight players, no intro).
- Expanded owned regression run initially: 14 failed / 63 passed; obsolete count, array index and formation expectations adapted without removing safety assertions.
- Added immediate-skip test: RED 1 failed / 11 passed; fixed held-edge suppression.
- Final command: node node_modules/vitest/vitest.mjs run shared/multiplayer-engine.test.ts shared/intro-engine.test.ts shared/engine.test.ts shared/entrance.test.ts shared/entrance-route.test.ts shared/engine-tuning.test.ts
  GREEN: 6 files, 81 tests passed. git diff --check on changed engine/tests passed.

Remaining integration contracts:
- Coordinator calls assignLocalControls after createGame, then startGame(state,true,true), passes seat-keyed inputs to stepLocalGame once per fixed tick, and calls skipIntro for skip UI. Pause stays caller-owned: do not tick the engine while paused. Lobby must remain locked while active.
- IMPORTANT actual tactics module currently uses formationPosition(team,slot,receiving:boolean,tuning,formation), where false means kickoff-taking attacker at -1 and true means opposing attacker at -3. Engine bridges with team !== receivingTeam. This differs from the contract's ambiguous receiving argument; coordinate any signature change with engine adapter line, not a competing module. Current module/tests were read and this adapter is verified.
- Renderer consumes intro phase/phaseTimer and introEnabled; engine owns no camera or UI.
- Main integration typecheck/build/browser tests intentionally not run while writers active; coordinator owns those checks after handoff. No dependency/config/global changes, commits, pushes or deployment performed.
