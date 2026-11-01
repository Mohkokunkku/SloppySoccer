# Sloppy Soccer agent team
The coordinator delegates bounded tasks to four isolated reasoning agents and integrates the results. These were real task agents, not a simulated discussion. They are not installed as always-running bots.

| Role | Ownership | Installed skills | Acceptance criteria |
| --- | --- | --- | --- |
| Visual designer | DESIGN.md, PRODUCT.md, public/design-board.html, docs/art-direction.md | claude-design, frontend-design; Impeccable guidance available | Analyze supplied toy photo; actual self-contained graphical design board; renderer-ready plastic/material/shape palette |
| Mechanics designer | shared/engine.ts + tests | test-driven-development | Eight figures; movement/ball/goals/keeper/AI/timer tested deterministically |
| Backend developer | server/ + tests | backend-architect, test-driven-development | Health/config/results API, validation, persistence, static serving, real injection tests |
| Frontend developer | src/ + tests | frontend-design, threejs-animation, test-driven-development | Procedural 3D toy field, controls, complete match UI, browser input/pure unit tests |
| Coordinator | contracts, infrastructure, CI/CD, integration | hermes-agent, systematic-debugging | Compile, run all tests, inspect real browser screenshots, execute push-to-local-server pipeline, report limitations |

## Repeatable work order
1. Read AGENTS.md and shared/types.ts before editing. Assign disjoint file ownership.
2. Write and run a focused failing test for each behavior. Implement and verify green.
3. Communicate contract changes to the coordinator rather than editing another agent's interface.
4. Coordinator runs npm run check and npm run test:e2e, reviews screenshots and git diff.
5. Commit, then git push local main. The local receiver exports that exact commit, installs locked dependencies, tests/builds/browser-checks/audits, smoke-tests an isolated production release and activates it only on success.
6. Browser-check the deployed server and inspect .local-server/current.json. A successful git push alone is NOT evidence deployment succeeded: post-receive errors cannot undo an accepted commit.

## Skill installation notes
Downloaded frontend-design, backend-architect, threejs-animation, and Impeccable into the default Hermes profile with approval. The first graphic-designer catalog install failed; Impeccable was installed as the replacement. Its optional binary context loader could not download its engine; no engine execution is required to run this game. Original visual assets are generated locally as geometry/SVG; no paid image service or external runtime assets.
