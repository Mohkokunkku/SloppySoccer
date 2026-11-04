# Verification

## Live tuning and presentation — November 4, 2026
- `npm run check`: **251 tests across 38 files passed**; strict TypeScript, frontend production build and NodeNext backend build passed. The Three.js scene bundle remains approximately 605.53 kB minified; the build reports a nonblocking chunk-size advisory.
- Final full production-browser run: **25 passed, 2 capability-dependent skipped, 0 failed, 0 flaky** across 27 discovered Chromium cases. Counts were independently aggregated from the real JSON report and checked against its stats.
- Passing checks include all earlier WebGL/start/pause/resume, full one-minute save-once/API read-back, national squad and gallery, both concept boards and three goal dance/reset checks; plus all eleven accessible sliders, live and paused geometry changes preserving match state, desktop/phone panel layout, entrance and pause/resume with frozen clock, stationary/paused ball rolling, native audio decode/playback/mute, nonzero paused rotation surviving a rebuild, and growing/shrinking the field during entrance while retaining its original tunnel anchor.
- Two **native OS tab-hide/window-blur** checks are explicitly skipped because this Chromium automation environment forces page visibility/focus, including in headed mode. They are NOT counted as passes. Attempts to remove a supplemental CDP focus override did not restore native transitions; a separate native/noDefaults browser probe failed loopback navigation with `net::ERR_ABORTED`. Twelve deterministic suspension tests verify cancellation of active sources and delayed decode in ready, finished, entering, playing, goal and resetting phases. Normal-browser hide/blur behavior and subjective listening quality remain manual checks; see `docs/fix-qa.md`.
- `npm audit --omit=dev`: **0 reported vulnerabilities**. Staged added-line scan found no hardcoded-secret, unsafe-shell, eval/exec or pickle patterns; whitespace checks passed.
- Four Sol/low specialists implemented mechanics, visuals, audio and browser QA in parallel. After an independent review found three integration edge cases, four additional bounded Sol/low workers addressed ball orientation, all-phase audio suspension, entrance route progress and regressions concurrently. All worker receipts pin **openai-codex / gpt-6.1-sol / low**, with no model fallback.
- The fresh independent final review **passed with no security concerns, logic errors or suggestions**, and independently executed 101 targeted tests in 11 files. Review and launch evidence is retained in ignored `.local-server/reviews/presentation-final.json`; broad coordinator execution, not worker self-report, establishes the counts above.
- Six bundled v2 WAV assets have measured nonzero PCM energy, safe peaks, durations and SHA-256 metadata in `public/audio-v2/manifest.json`. Actors, licences and edits are documented in `public/audio-v2/CREDITS.md` and the visible in-game disclosure. Crowd recordings are Gregor Quendel / CC BY 4.0; voice/impact assets are Kenney / CC0. The 4.35-second goal sting is original synthesized instrumental music, not a recording of live musicians or a paid-generation claim.
- Actual desktop and 390px phone captures were inspected, including maximized pitch/goal geometry and all eleven sliders. Entire pitch/goals and the dressing-room deck remain framed; the panel has readable labels/outputs and no horizontal overflow. Motion is verified by executable tests, not inferred from still images.
- Preview: `http://127.0.0.1:3002`, separate `.local-server/presentation-preview-data`. Both preview and existing production health endpoints returned `status:ok`. Production's pointer remains `git-810f0d8f07c3-1793818025530`; this feature work is not merged, pushed or deployed to main. Background preview servers are not installed Windows services.

## Previous international squad verification
- `npm run check`: **188 tests across24 files passed**, strict TypeScript and frontend/backend production builds passed.
- Complete `npm run test:e2e`: **13 Chromium checks passed**, including all earlier match/phone/persistence/role checks, actual voice playback, three real five-second goal/reset rehearsals, both concept boards, the real 3D squad shelf with working camera/focus, and A1/A3/A2 assignment in the actual match.
- `npm audit --omit=dev`: **0 reported vulnerabilities**; `git diff --check` passed.
- Squad desktop and phone screenshots were inspected. All three adult moulds are distinct and unclipped, including the bearded captain and headband runner; individual focus is usable on a phone.
- The 3D artist, preview specialist and QA specialist worked in parallel under `docs/squad-contract.md`; coordinator performed the combined gates. Final independent review is recorded separately.
- Spain's goalkeeper and Argentina keep their original figures; no simulation state or physics changes are introduced by mould selection.
- Voice clips were generated locally with installed Windows speech voices after the configured remote speech tool timed out. Catalogue speech-skill installation did not complete. Existing local playback passed browser checks; no voice-cloning service is claimed.
- Crowded role-label decluttering remains pending explicit approval after an execution-approval timeout; it was not attempted through another tool. Markers otherwise work and use per-mould height anchors.
- Main's Git ref/release are not merged or activated by this feature branch. Preview background servers require manual startup and are not Windows services.

## Role-based AI branch — November 2, 2026
- `npm run check`: **141 tests across 17 files passed**, strict TypeScript checks and frontend/backend production builds passed.
- `npm run test:e2e`: **5 Chromium checks passed**, including selected-role switching and tooltip, WebGL lifecycle, phone overflow, full one-minute match with save-once API read-back, and the design board.
- `npm audit --omit=dev`: **0 reported vulnerabilities**.
- Regression coverage includes settled support figures, delayed tactical replanning instead of animation-frame chasing, immediate user-control handoff, deeper defender positioning, one loose-ball chaser, keeper possession exclusion, blocked passing lanes, and home/away mirroring.
- A real `gpt-6.1-sol` / low-reasoning frontend worker run returned a proposal. Its four behavior tests pass and its output is used as the selected-role tooltip. DeepSeek is disabled and has no automatic fallback. See `agents/README.md`.
- Isolated branch preview runs on loopback port 3001 with its own result storage; `GET /api/health` returned `{"status":"ok"}`. Main's release pointer still references `git-13521d477fed-1793570859746`; no branch activation or merge is claimed.
- The desktop screenshot was inspected: toy pitch and goals render, the selected role is visible, and the field is not clipped. A still image alone is not proof of AI movement; executable mechanics regressions cover the behaviors.
- Telegram progress is scheduled every 30 minutes through a script-only job (no LLM), reading a timestamped progress snapshot. It requires an awake computer and the Hermes gateway running.

## Previous deployed-main verification
- `npm run check`: **110 tests passed across 13 files**, strict TypeScript typecheck passed, Vite production frontend and NodeNext backend compiled.
- Crowded-keeper regressions reproduced held possession theft and immediate recapture of a low clearance. Ten additional tests now cover protected possession and lofted clearance for both teams, plus repeated catches under pressure across easy/normal/hard; the full 110-test run passed.
- A real Windows archive-extraction regression reproduced GNU tar interpreting the drive-letter path as a remote host. Using a relative `source.tar` argument with an absolute working directory fixed it; the regression and the full 100-test run passed.
- Independent review passed after the signal-exit cleanup fix; the two new process-lifecycle regressions passed before the full 99-test rerun.
- `npm run test:e2e`: **4 Chromium tests passed**: WebGL page/start/pause/resume; 390px phone layout with no horizontal overflow; full one-minute match with exactly one real result POST and API read-back; graphical design board rendering.
- `npm audit --omit=dev`: **0 reported vulnerabilities** with the committed lockfile and glob/minimatch overrides.
- `RELEASE_ID=preview npm run deploy:local`: all gates repeated successfully, production dependencies installed in isolated release, actual production server passed health/page smoke checks, activation pointer written.
- Production supervisor started via `npm run serve:local`; read-back from `http://127.0.0.1:3000/api/health` returned `{"status":"ok"}` and config returned `{"duration":120,"difficulty":"normal"}`.
- Desktop and mobile screenshots were inspected. The complete pitch/goals are visible; the supplied photo's molded-plastic player, black boots, white lattice goal and wood setting were translated into original procedural art.

## Evidence
Playwright writes `test-results/sloppy-soccer-desktop.png`, `sloppy-soccer-mobile.png`, `sloppy-soccer-fulltime.png` and `sloppy-soccer-design.png`. These are generated local evidence, not committed build assets. The illustrated design board also has `public/design-board-preview.png`.

## Limits
Headless Chromium was tested, not every browser/device. Online multiplayer, competitive server-authoritative scoring, accessibility certification, sound, a persistent Windows service, and deployment to a different LAN machine are not part of this version. The GitHub workflow is supplied but no remote GitHub run is claimed. Local result storage is one-process JSON, and recorded scores are explicitly casual/untrusted. The server is bound to loopback unless the owner deliberately changes HOST.
