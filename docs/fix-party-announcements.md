# Party announcement lifecycle handoff

Scope: feature/local-multiplayer-formations, D:/SloppySoccer/Game. Changed only src/main.ts announcement lifecycle, new src/phase-announcement.ts, src/phase-announcement.test.ts, tests/browser/phase-announcement.spec.ts and this doc. Preserved existing unrelated changes. Read AGENTS.md, local-party-contract.md, current main/model/types/browser config and available QA/presentation-review handoffs. No current standalone presentation verdict was located by filename/content searches; used the exact coordinator-provided overlay-cache symptom, not an invented review approval.

Fix: run a phase/paused transition cache BEFORE the panel overlay early return. Entering -> intro -> playing now produces separate live messages even though all use overlay none. Spotlight explicitly advertises Skip intro. Repeated RAFs return null and do not rewrite #announcer. Full-time retains the original accurate score and matchPresentation result title, emitted once rather than overwritten on later frames. Pause/resume restores the actual phase announcement. Main uses the tested helper; no input, physics, renderer or other UI policy changes.

Actual commands/results:

- git status --short; git branch --show-current: exit 0, required branch confirmed; existing staged work present.
- 'C:/Program Files/nodejs/node.exe' node_modules/vitest/vitest.mjs run src/phase-announcement.test.ts
  RED: exit 1, 2 failed / 5 passed (7). First implemented the existing overlay-only cache in the extracted helper. Exact spotlight expectation received null after entrance; pause/resume phase-loop also failed.
  GREEN after changing cache key to phase + paused: exit 0, 7 passed, 1 file. Includes all phase duplicate-frame suppression, pause/resume, three final outcomes and new-match reset.
- git diff --check -- src/main.ts src/phase-announcement.ts src/phase-announcement.test.ts tests/browser/phase-announcement.spec.ts: exit 0, no output.
- 'C:/Program Files/nodejs/node.exe' node_modules/@playwright/test/cli.js test tests/browser/phase-announcement.spec.ts --list
  Exit 0: 1 test in 1 file. Discovery only, NOT a browser pass.

Browser regression authored but NOT RUN under the concurrent-writer restriction. It starts via real Start match, checks actual #announcer during entering and natural intro, clicks real Skip intro, checks play and pause/resume, then observes twelve real RAFs. A DOM MutationObserver requires exactly the expected live-region writes (no frame spam). No fake engine state, clocks, graphics, network responses or controller claims. Observer metadata is test-only on the real DOM element.

Integration assumptions: production engine reaches entering -> intro naturally within existing 30-second entrance budget; #skip-intro invokes actual skipIntro; default seat remains P1 Spain. Existing live role=status/aria-live=polite remains unchanged. Final score is immutable after finished, as engine contract requires; cache intentionally ignores score/seat changes within one phase. Source unit GREEN does not prove browser integration or actual screen-reader speech. Coordinator must rebuild current assets after writers freeze, then run the new browser file against real server/rendering. Browser RED/GREEN, full build/typecheck, integrated suite and review acceptance remain pending. No server/build/full suite, installs, credentials, global settings, tasks, commits, pushes or deployment performed.
