# Verification

## Executed on this PC
- `npm run check`: **99 tests passed across 12 files**, strict TypeScript typecheck passed, Vite production frontend and NodeNext backend compiled.
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
