# Sloppy Soccer agent contract
TypeScript-first original toy soccer game. Repo D:/SloppySoccer/Game. Node/npm available in Windows git-bash; use native D:/ paths with programs. Do not edit unrelated files or commit: coordinator owns integration and Git.
## Ownership
- Visual designer: docs/design*, docs/art*, public/design* and DESIGN.md, PRODUCT.md only.
- Mechanics: shared/engine.ts, shared/engine.test.ts, docs/mechanics.md only.
- Backend: server/**, docs/backend.md only.
- Frontend: src/** only.
- Coordinator: shared/types.ts, package/config files, scripts, CI/CD, README, browser integration.
## Contracts
Read shared/types.ts. Simulation coordinates: x from -16 to 16 (home attacks +x); y from -10 to 10; renderer maps simulation x to scene x, simulation y to scene z; vertical ball z maps to scene y. Eight players total (3 outfield + keeper each).
Mechanics API: export createGame(config?: Partial<MatchConfig>): GameState; export startGame(state: GameState): void; export stepGame(state: GameState, input: InputState, dt: number, config?: Partial<MatchConfig>): void; mutates state in place. Default 120-second matches, fixed 1/60 simulation step in client.
Backend API: GET /api/health -> {status:'ok'}; GET /api/config -> {duration:120,difficulty:'normal'}; GET /api/results -> {results:MatchResult[]}; POST /api/results body {home:number,away:number,duration:number}, -> 201 {result:MatchResult}. MatchResult from shared/types.ts. Results are LOCAL casual untrusted scores, never competitive verified. Disk storage path configurable. Serve dist via Fastify. Export buildApp(options?) from server/app.ts; index.ts starts host 127.0.0.1, port env PORT default 3000. Support env STATIC_DIR, DATA_DIR for deploy script. NodeNext compatible .js imports in backend. Unit tests Fastify injection.
## Quality
Load relevant installed skills. Strict TDD: write a focused behavioral test, run it to verify RED, implement, verify GREEN. Repeat vertical slices. Test with npx vitest run [owned test file]. Coordinator installs dependencies; do not run npm install in parallel. No fake output. Report paths, test command/output and limitations. No root config changes without coordinator agreement.
## Visual brief
Photo D:/SloppySoccer/soccer figure.jpg: small molded plastic footballer, glossy black shirt/shorts/tall boots, flesh-tone face/legs, short dark brown combed hair, arms spread; rigid white rectangular square-lattice goal; set on pale gray warm woodgrain floor. Original interpretation: tabletop toy football, tactile molded seams, chunky rounded limbs, satin plastic, ivory lattice goals, warm oak tabletop, green inset pitch, coral home and blue away kits, charcoal keepers. Fixed orthographic three-quarter camera, readable player selector and ball shadow. No external paid/generated assets required; procedural Three.js objects.
