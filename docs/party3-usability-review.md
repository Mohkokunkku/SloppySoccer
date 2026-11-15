Usability QA handoff

Review scope: role-charge.ts, charged-local-input.ts, control-help.ts, controls-guide.ts, main.ts, shared/tuning.ts. Added src/role-charge-regressions.test.ts covering seat authorization, cross-seat charge identity, possession loss, seat/control reassignment, phase gating and non-mutation.

Findings
- src/role-charge.ts:5-10 authorizes by matching seat/player charge plus current ball ownership during playing; unauthenticated/invalid charge renders zero. No production blocker found in this path.
- src/main.ts:353 explicitly focuses the pitch after a mouse sound-toggle click only when not paused and outside ready state. Native keyboard button activation is ignored by the global gameplay key handler at main.ts:366-368, retaining normal button activation/focus. Existing browser sound focus coverage is tests/browser/sound-toggle-focus.spec.ts:3-10; coordinator owns browser execution.
- src/control-help.ts:3,9-11 implements manual popover in the browser top layer and positions it against viewport bounds. No layering blocker found.
- shared/tuning.ts:2-8 sets shot charge default .6s and slider bounds .2–2s. src/tuning-panel.ts:6,12 exposes the labelled slider and Reset tuning.
- Browser regressions were subsequently created by a separate pinned Luna/low QA worker in `tests/browser/party3-usability.spec.ts` and executed by the coordinator. Tuning defaults/reset, native keyboard Sound activation and paused mouse Sound focus passed. The charge test initially raced live possession after installing observation during play; moving read-only observation before kickoff removed that delay. Real marker progression, preserved positional letter, release and fresh-match pause cancellation then passed. Final full-suite evidence is recorded separately in `party3-verification.md`.

Verification: `python .local-server/capture-node.py node_modules/vitest/vitest.mjs run src/role-charge-regressions.test.ts src/role-charge.test.ts src/kick-meters.test.ts` — 3 files, 7 tests passed. Earlier RED exposed that a test's alternate seat had its own valid charge; corrected fixture and reran GREEN. No browser, full build, typecheck or other test suite run per scope limits.