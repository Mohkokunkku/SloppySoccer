# Phase message correction handoff

Scope: feature/local-multiplayer-formations; only src/phase-announcement.ts, src/phase-announcement.test.ts and this document changed by this pass. Existing unrelated/staged changes preserved.

Root cause: the helper's default return announced active play for goal and resetting. Added explicit goal/score and return-to-kickoff messages, and restricted “Match in play” to playing. API and phase/pause transition cache are unchanged.

## Focused TDD evidence

Command (each run, from D:/SloppySoccer/Game):

    "C:/Program Files/nodejs/node.exe" node_modules/vitest/vitest.mjs run src/phase-announcement.test.ts

- Initial RED: exit 1, 2 failed / 7 passed (9 tests); both goal score cases received “Match in play. P1 Spain →”.
- Expanded RED before implementation: exit 1, 3 failed / 7 passed (10 tests); independent resetting assertion also received the false active-play message.
- GREEN after minimal helper fix: exit 0, 10 passed (1 test file).
- git diff --check -- src/phase-announcement.ts src/phase-announcement.test.ts: no output/errors.

Coverage: playing → goal → resetting → playing for either team's goal, exact score text, repeated-frame suppression, standalone resetting, pause/resume including goal/resetting, entering, spotlight/Skip intro, full-time win/loss/draw scores, and new-match entrance after ready reset.

## Integration assumptions and limits

Existing main.ts calls update(state, paused, teamNote) before its overlay-cache early return, and writes only non-null announcements. No lifecycle or browser files changed. The engine increments the score before entering goal; announcements assume callers observe phase transitions and provide that current score. Home/away remain Spain/Argentina, matching existing full-time wording. Score-only mutations inside an unchanged phase do not invalidate the existing phase/pause cache; this pass deliberately preserves that contract. Ready returns null while resetting the transition key for the next match.

No full build, browser suite, dependency change, commit, push, deployment, task installation or production-process action performed. Focused test success is not presentation review approval; coordinator retains browser/integration review.
