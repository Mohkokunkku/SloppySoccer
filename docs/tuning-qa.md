# Presentation tuning QA handoff

## Scope and execution status

QA owns only this document and `tests/browser/tuning-presentation.spec.ts` under the presentation-tuning contract. No production source, configuration, dependencies, existing browser tests, deployed server, or other workers' files were changed. No build, install, commit, or deployment was performed.

Production browser execution is NOT YET RUN. The coordinator has not confirmed that the production build is ready. The contract explicitly forbids running this spec before that confirmation; its handoff exception takes precedence over attempting RED against stale production output. These are tests-first regression specifications, not verified RED/GREEN results. No passing browser assertions are claimed.

Discovery verification performed:

    node node_modules/@playwright/test/cli.js test tests/browser/tuning-presentation.spec.ts --list

Actual result: exit code 0; `Total: 7 tests in 1 file`. This only verifies Playwright import/collection, not TypeScript typechecking, browser execution, or production functionality.

Once the coordinator confirms its production build is ready, run only:

    node node_modules/@playwright/test/cli.js test tests/browser/tuning-presentation.spec.ts

Use the existing production Fastify Playwright configuration on 127.0.0.1:4173. It must not reuse/change the existing port 3000 production process. The coordinator owns building the artifacts and full E2E integration. This spec uses real production routes and native browser audio decoding; no request interception, engine injection, fake scores, mock audio, or global mutable production debug hooks.

## Coverage (seven collected tests)

1. All eleven sliders: exact accessible labels, native bounds/steps, visible associated outputs, real keyboard changes, status region, reset defaults. Native step snapping is allowed within half a step because the default sprint multiplier is not aligned with its HTML range step.
2. Entrance: actual entering diagnostics/label, nonzero entry count, frozen match clock, pause/resume during entry, unchanged paused ball/run/entry diagnostics, eventual playing phase, zero remaining entries, ticking clock, eight markers.
3. Existing live match: wait for the clock to advance, pause for deterministic preservation checks, change all geometry dimensions through actual keyboard controls, compare renderer geometry diagnostics, preserve score/clock, retain eight markers and one canvas, verify physics-only changes do not rebuild the board, geometry does rebuild, reset and resume the same clock.
4. Ball freeze: real match and shot input, require actual ball displacement first, then verify ball position/rotation and other diagnostics remain fixed during pause.
5. Desktop expanded panel at 1440x960: maximum geometry, usable slider widths, visible outputs with minimum 12px font, controls within viewport, document overflow check, screenshot.
6. Phone expanded panel at 390x844: same readable-panel/overflow checks and screenshot. Controls may scroll vertically; they must not require horizontal scrolling.
7. Audio: fetch all six real audio-v2 WAVs, decode deployed bytes using native AudioContext, require positive duration/channels and goal music of 3–5 seconds, real optional demo increments data-played, mute/pause stop later count increments, immediate demo/mute exercises asynchronous cancellation, no displayed audio error.

All tests capture page exceptions and console errors, failing at teardown if any occurred. Screenshots use Playwright's per-test output directory.

## Limitations and integration notes

- Zero browser tests executed; zero browser pass/fail results. Discovery found seven tests. RED/GREEN validation remains pending coordinator build readiness.
- Readonly renderer diagnostics must come from real renderer state as specified by the contract. Tests intentionally fail if absent; no fallback to fabricated scene data.
- Score preservation is tested against the score of a real match (which may still be 0–0), not a fake forced goal. Clock preservation is checked after a real tick and while paused to avoid ordinary simulation progress being misidentified as tuning loss.
- Browser audio checks prove real asset decoding, production playback accounting and absence of delayed playback-count increments. They do not prove audible speaker output, human-recording provenance, precise gain, or that an already-started source becomes silent: data-played is cumulative, not an active-source diagnostic. Active-source stop/disconnect and pending generation-token cancellation need the audio worker's owned runtime tests. No undocumented DOM diagnostic is assumed.
- Cancellation under deliberately slow network decode, hidden-page cancellation, shot-vs-pass crowd classification, all tuning-dependent simulation powers, and nonzero-score preservation need owned runtime/unit tests or coordinator follow-up; the browser spec does not claim them.
- Renderer dimension diagnostics plus a functioning canvas are not pixel-perfect measurements of individual goal meshes. Visual mesh/unit tests remain the visuals worker's responsibility. Screenshots support coordinator review rather than silently accepting a new baseline.
- Existing coordinator-owned browser tests still expect immediate playing in places and legacy audio paths. They were not changed; integration should reconcile those expectations with entrance/sample changes.
- The configured browser timeout is 45 seconds; entrance completion explicitly allows 30 seconds. Software WebGL throughput can affect wall-clock completion. Do not weaken phase assertions to mask a real entry stall.
