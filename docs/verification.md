# Verification

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
