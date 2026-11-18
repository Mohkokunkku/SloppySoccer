# Party6 verification

Work began November 17, 2026; final verification completed November 18, 2026 after a computer restart. Base: `08eed2d9fdf67b6a0541bfd185cd00c0353078e2`. Branch: `feature/party-controls-charged-shots`.

User correction: previous narrow pair was too close and both appeared to converge on an attacker. Restore a broad near-level line with a modest offset; when one defender forechecks, keep its partner genuinely behind.

## Implemented scope

Normal paired AI support retains **7.6 canonical units of lateral separation** and a **0.9-unit total depth offset**, shifting modestly with the ball. When a defender forechecks, its partner targets **4.5 units goal-side**, where field space permits. Near the end line, bounded depth and an alternate lane avoid crowding the tackle. A human DEF already challenging within **2.5 units** gets AI cover instead of a second AI presser. Single-defender 1-2-1 and secure keeper possession retain their existing plans. Incidental interceptions remain allowed.

Production change is confined to shared/tactics.ts. Engine physics, player roles/moulds, input, keeper cooldowns, score saving and approved victory music/voices are unchanged. Old Party5 narrow/deep-support and close pass-screen assertions were intentionally superseded; retained safety/determinism/mirroring/scaling/tackle tests and added width/small-offset/deeper-cover/actual-motion checks.

## Established evidence

- Initial six-case regressions failed against base `08eed2d`: normal width was 0–2.82 units, depth offset was 2.5 units, wing cover was only 2.68 units behind, and midfield-pressure cover was only 1.8 units wide. A further human-forechecker regression also failed before its separate fix.
- Focused engine/tactical set: **7 files / 129 tests passed**, including mirrored 15-tick approach/retreat before possession changes—not just action labels. The independent Luna/low QA handoff and corrected phase fixture are documented in `party6-qa.md`.
- Full npm check: **559 unit tests / 83 files**, strict client/server builds and deployment-runtime build passed. Building did not activate deployment.
- Three focused built-production browser checks passed: both real arrow-key wing dribbles maintain broad support with small offset; actual wing pressure retains separate deeper cover. Uses readonly snapshots and real controls, no simulation injection. Inspectable screenshots/live-frame evidence retained in `.local-server/verification/party6-focused3`. Paused screenshots confirm separation/layout, but possession can change before capture; forecheck timing claims rely on recorded playing frames and actual-engine tests, not inferred still-frame action.
- Independent read-only **GPT-6 Luna, low reasoning** review passed without confirmed logic/security defects. The reviewer independently ran 7 focused files / 129 tests and whitespace checks. Verdict and actual-model receipts were read back from `.local-server/reviews/party6/`.
- Latest hash check: **250 non-document source/artifact files unchanged**. Audio/input/main/engine production files equal the base commit. Static scan positive controls passed without findings; installed production dependency audit reported zero vulnerabilities.
- Quiet preview health passed at `http://127.0.0.1:3003`. The index, rehearsal and 17 referenced diagram/audio assets matched built files; results were readable. `SloppySoccer-GitHubDeploy` remained `Disabled`, `Enabled=false`. No services, watchers, scheduled tasks, remote push, deployment or production-pointer activation were added.
- Fresh combined gate passed from **2026-11-18T20:07:35.552746Z** to **2026-11-18T20:20:08.374661Z**: **559 unit tests / 83 files**, strict client/server/deployment-runtime builds, **67 browser cases: 65 passed, 2 skipped**, zero unexpected/flaky/global errors, and **250 unchanged source/artifact hashes**. Read back `.local-server/verification/party6/receipt.json` and verified counts against the browser report, both reviewer verdict/model receipts and current source. These are new Party6 results, not reused Party5 totals.

Two READY-audition cases were skipped for unsupported native alternate-tab visibility hiding/native window blur in the test environment. Those capabilities, physical controller hardware and subjective playback quality remain manual, not claimed by automated tests.

## Computer restart and shot-fixture correction

The first full run ended with observed process exit `1073807364`, without a final receipt/report. Boot-time inspection established a computer restart on November 18. Available logs, traces and source snapshots remain in `.local-server/verification/party6-interrupted`; that run is **not** a pass. Its partial log exposed an input-test fixture race. KeyA remained held through a slow screenshot, driving P1 to `x=-17.6` before turning and releasing beside teammates. Latest-rendered releases showed a teammate pass/shot rather than the earlier player release: an immediate pickup/action can replace the latest-release diagnostic within one catch-up RAF.

The only post-review source change is `tests/browser/party2.spec.ts`: charge while moving into open flank with KeyW, release immediately after the same charging/progress checks, observe the same real P1 shot and meter clear, then take a screenshot after movement release. Restart/pause cancellation and no-shot-on-resume assertions remain; no timeout increase or simulation injection. Corrected test passed three consecutive fresh matches after reboot. Supplemental Luna/low read-only review passed, and the fresh full gate then passed against the corrected harness and unchanged production source. Exact interruption/source-change record is retained separately, not replaced with a fabricated receipt.

## Failed focused attempts retained

Earlier tactical harness failures are also preserved. A supposed normal loose-ball fixture legitimately triggered defender forecheck; its corrected setup explicitly establishes midfield pressure while separate mirrored tests require deep forecheck cover. Early browser drafts outran Easy AI or assumed the nearest challenger must be a defender. Final observation follows the actual role: defender pressure requires a deeper partner; other-role pressure requires both defenders wide and goal-side. Production behavior was not relaxed to satisfy those drafts, and those failed runs are not reported as passes.
