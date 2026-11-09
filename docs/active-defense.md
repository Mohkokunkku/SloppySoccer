# Active defensive pressure — local preview

This change supersedes the older requirement to reserve defenders exclusively for deep central emergencies. The user requested more aggressive challenges and shot/pass-lane coverage.

## Behavior
- Defenders may join the single-presser selection throughout their own half, including the wings, or challenge a carrier already within close reach across halfway. They are no longer categorically excluded until normalized x < -10 and abs(y) < 6.
- In an opponent-owned attack in the defending half, the nearest available covering defender screens the actual carrier-to-goal line. Another covering defender cuts a dangerous forward receiving lane, or keeps a separate supporting cover position if no useful receiver exists.
- Active defensive cover is not overwritten by fixed duplicate-role kickoff lanes or the old unconditional depth-below-midfield clamp.
- With possession, in a safe forward phase, and outside these defensive-threat conditions, existing role shape remains. No bot speed, tackle range, shot strength, keeper behavior or human ownership rule changed.

## Verification
- RED: mirrored normal-attack tests selected a distant midfielder instead of the nearby defender; mirrored shot-screen tests returned the fixed wide y=4.5 target; pass-screen tests initially returned the same goal-screen target for both defenders.
- GREEN: `npm run check` passed **433 tests / 58 files**, strict typing, client/server builds and deployment-runtime build on November 8, 2026. Existing Vite deprecation advisories remain nonblocking.
- `shared/defensive-pressure.test.ts` exercises mirrored pressure, shot/pass screens, real-engine possession wins in both formations, wide attacks, human/keeper exclusions, deterministic purity and live-field scaling. Two old tactical and two old engine retreat assertions were intentionally replaced with challenge/ball-win assertions; other existing safeguards were retained.
- The existing port-3003 process serves the new built index and all five referenced assets byte-for-byte. Separate preview results data and the production release pointer are unchanged; no restart was necessary for client-only tactics.
- A headless Chromium smoke check against port 3003 verified real WebGL, ten figures, match entry/intro skip, actual keyboard input and zero console/page errors. Renderer position samples and a real screenshot are under ignored `.local-server/verification/active-defense/`.
- No new agents or recurring jobs were started. The deployment task was read back as Disabled / Enabled=false.

At the local verification handoff, these were uncommitted working-tree changes on `feature/local-multiplayer-formations`. PR #1 was subsequently found merged; publication is a separate coordinator action on `fix/aggressive-defender-ai` with a follow-up PR. See the commit/PR history for its outcome. This record does not claim a rerun of the entire browser suite, physical-controller validation or a new independent code review.
