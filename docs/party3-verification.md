# Player charge meter, tuning, handshakes and quick controls — verification

Verified on 2026-11-15 in `D:/SloppySoccer/Game`, branch `feature/party-controls-charged-shots`, based on local party commit `0f6d6640b69f398b7d05dd3f0b4fa8bd7f96a14f`.

## Delivered

1. The controlled player's existing positional letter is now an authorized shot meter: its background fills upward and changes green/amber/coral as charge rises. The letter remains readable. Release, possession/control/phase loss and cancellation restore the normal badge. Original nearby seat badge remains independent and legible. The existing per-seat pitch-edge meters remain available.
2. Tuning lab exposes **Shot charge time**, default **0.6 seconds**, range **0.2–2 seconds**, step **0.05 seconds**. Lower fills faster. Each hold snapshots its duration; an edit applies to the next shot, never retroactively to a hold. Restart keeps tuning; Reset tuning restores the default. Keyboard, touch and standard-pad shots use the same timing path.
3. After the original three-theme 16-second victory party, either winning side joins the opposing team: a two-second approach and four-second handshake, five stable-ID pairs including keepers. Actual connected right-arm geometry and palm contacts are solved without stretching moulds. Both teams smile. The elevated wide camera frames all complete figures. Pausing freezes camera/roots/hands; reduced motion is static. Winner presentations total 22 seconds; neutral draws stay eight. Simulation and score saving remain terminal/save-once.
4. Keyboard/gamepad icons are beside the scoreboard. Hover displays the correct illustrated bindings in the browser top layer, above pitch/setup; moving onto the help keeps it open. Keyboard focus and touch pinning are supported, with outside/close/Escape dismissal and viewport clamping. Escape dismisses help without also pausing the game. Active-icon color/font-size regressions prevent generic button styles from making the icon unreadable.
5. Physical mouse Sound toggles restore pitch focus during active, nonpaused play so Space can shoot immediately. Keyboard button activation stays native and focused, and paused/setup clicks do not steal pitch focus.

## Final gates

- `npm run check`: **500 tests in 74 files passed**, with strict client/server/deployment builds. Existing Vite large-chunk/deprecated-option warnings are nonfatal; no TypeScript errors.
- Full built-production Playwright suite: **59 cases: 57 passed, 2 skipped; zero unexpected failures, zero flaky cases, no global errors**.
- Final runner started `2026-11-15T19:57:13.851456+00:00`, finished `2026-11-15T20:06:41.798850+00:00`. All **224** non-document source files retained identical SHA256 hashes across checks and browser replay, and were compared again afterward.
- The browser replay includes a natural one-minute match, exact single score submission, backend result readback, pause/resume, rematch and existing keyboard/touch/controller/intro/audio regressions. New real-UI cases verify positional charge/release/pause, slider defaults/reset, sound mouse/keyboard/paused focus, desktop/phone hover/focus/tap help, and both home-/away-winning handshakes with five actual palm contacts and no rehearsal score writes.
- The two native capability skips are `READY goal audition cancels on actual alternate-tab visibility hide` and `READY goal audition cancels on native browser window blur`. They are **not passes**; true OS focus/tab behavior and physical controller hardware remain manual checks.
- Production dependency audit: **zero advisories**. Added-line secret/shell-injection/unsafe-eval scan found no matches; each pattern was tested with a positive control. Staged diff whitespace check passed.
- Parallel specialists and reviewers were pinned to `openai-codex / gpt-6-luna / low`; their actual-model receipts were checked. Initial handshake work was incomplete and was corrected/integrated by the coordinator, not treated as a pass. A separate QA worker supplied browser regressions. A fresh source review's speculative native-activation/single-seat concerns were checked against the actual specification and independently cleared; final code review has no confirmed security or logic defects. Review did not claim to execute the full browser suite; the coordinator's replay above is its integration gate.

## Evidence and local preview

Ignored local receipts under `.local-server/verification/party3/`: `source-before.json`, `check-output.txt`, `browser-report.json`, `case-aggregate.json`, `receipt.json`, `static-scan.json`, `preview-readback.json` and screenshots under `browser-artifacts/`. Independent review receipts/verdicts are under `.local-server/reviews/party3/` and `party3-final/`; worker receipts are under `.local-server/agents/party3/`.

The quiet, non-watching manual preview is at `http://127.0.0.1:3003/`; victory rehearsal is `/victory.html` (choose a result and a theme). Health and results API were read back; both HTML pages and ten referenced built assets/diagrams were byte-compared with `dist`. Preview results use the separate `.local-server/party-preview-data` directory. This is a tracked, session-managed server, not a Windows service.

Automatic task `SloppySoccer-GitHubDeploy` remains **Disabled / Enabled=false**. Production release pointers, production results and paused Telegram updates were not changed. This follow-up is local-only unless separately published; no merge or automatic deployment was performed.
