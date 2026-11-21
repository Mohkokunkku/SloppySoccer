# Confirmed Argentina squad: verification

## Approved integration

The user selected **P04, P01, P06, P05** for the four outfield players and **K01** for the goalkeeper, then explicitly requested implementation in the game.

Stable cosmetic mapping:

| Player ID | Confirmed mould | Default tactical slot |
|---|---|---|
| away-0 | P04 Veteran | Attacker |
| away-1 | P01 Anchor | Midfielder |
| away-2 | P06 Engine | Defender |
| away-4 | P05 Winger | Defender |
| away-3 | K01 Keeper One | Goalkeeper |

Cosmetics follow stable player IDs, not array position or mutable formation roles. Any Argentina keeper is selected by its actual keeper role; unknown outfield IDs safely fall back, including prototype-like strings. The source catalogue, approved geometry, proportions, Spain moulds, shared simulation, audio, controls and backend remain unchanged from `d52fbb04f2d73d7b4ed09d2b6923de8dbc8e7ae3`.

## Runtime adaptation

`createFigure` now dispatches the confirmed Argentina factory adapter. It retains original articulated knees/elbows without adding another rig layer, sets runtime player names and model metadata, derives marker bounds/ground offsets from actual geometry, and aliases keeper gloves to actual `hand` meshes for the existing handshake solver. Factory/gallery instances remain untouched.

Intro and post-match cameras now locate the actual face-geometry surface. The former unit-sphere point was incorrect for the translated lathe heads. World-space tests preserve the original Spain sphere anchor and verify the selected heads are targeted, not the root. Texture cleanup releases the newly active per-instance kit maps when figures are replaced or the renderer closes.

The gallery acknowledges the confirmed lineup. Further shortlist changes remain drafts and cannot silently replace the live squad.

## Established checks

- New runtime-dispatch, face-anchor, resource and resolver tests were exercised RED before implementation. The coordinator additionally caught inherited-object-key lookup and replaced a tautological reorder assertion with an actual order comparison.
- Focused integration/animation/camera/handshake set: **9 files / 66 tests passed**. Existing renderer tests still cover all 25 distinct real cross-team palm contacts, pause, reduced motion, complete framing and state immutability.
- A pre-final full unit run passed **580 tests / 89 files**. After the additional prototype-key regression, the fresh frozen gate's unit output reports **581 tests / 89 files passed**.
- Strict client/server build passed. Existing bundle/deployment-builder deprecation warnings were not hidden and are not test failures.
- Five gallery browser cases passed. The new real-match case passed with all five exact model IDs, unchanged Spain identity, correct Argentina accessible labels and actual movement through native P2 keyboard controls.
- Actual live preview captures in `.local-server/verification/argentina-squad-renders/` show the chosen models in play, intro framing and desktop/mobile layout. They were inspected. The intro capture is not advertised as a frozen face close-up: native timing continues during screenshot capture.
- Independent fresh read-only Codex review passed with no confirmed security, logic or material visual defects; verdict read-back is required before delivery. It did not run or claim the coordinator's final gate.
- Installed production dependency audit reported zero vulnerabilities. Staged static scan positive controls passed with no findings.
- Preview `/`, `/victory.html`, `/argentina.html` and 19 referenced assets/diagrams matched the built output. Results were readable; `SloppySoccer-GitHubDeploy` remained disabled (`Enabled=false`).

## Preserved failed attempts

Seven old unit assertions described superseded Argentina details: undefined character metadata, old private pivot names, floating stripe meshes and local sphere-face positions. They were replaced with approved IDs, actual joint arrays/motion, surface texture colors/UVs and transformed face geometry without removing the original state, hand-contact, keeper or Spain guards.

A foreground combined check/browser command exceeded its 150-second window. Scoped liveness was checked: no test server remained on 4173; only the independent quiet preview was active. Its artifacts remain in `argentina-squad-focused`. The first new browser fixture used a nonexistent seat selector, then an overly broad player selector matched both a role marker and a seat badge. Corrections use the actual `#seat-p2-enabled`/keyboard2 controls and `.role-marker` scope. Native movement/model assertions remain; no timeout was enlarged to hide these errors.

## Final combined gate

The November 19 attempt was interrupted by shutdown/restart and is preserved separately in `argentina-squad-interrupted-20261119`. The November 20 complete attempt passed 581 unit tests and 70 browser cases, skipped two native capability cases, and failed only the older `squad.spec.ts` assertion expecting empty Argentina character IDs. That run is preserved in `argentina-squad-stale-fixture`. Only that expected-ID row changed afterward: all Spain assertions, ten-marker count, real advancing clock and pause/resume remain. The exact affected case passed on rerun; a separate independent fixture-addendum review passed. No production source changed for this correction.

Fresh final combined gate passed on **November 21, 2026**, from **21:12:49.713172 to 21:26:25.714513 UTC**: **581 unit tests / 89 files**, strict client/server/deployment-runtime builds, and **73 browser cases: 71 passed, 2 skipped**. There were **zero unexpected failures, flaky cases or global errors**. All **266 source hashes** were unchanged. The raw receipt, per-case aggregate, browser report and check output are retained in `.local-server/verification/argentina-squad-final/`. Independent integration and fixture-addendum verdicts passed; source and preview are read back again before local delivery. The audition gallery's earlier receipt is not used as evidence for this integration.

This is local feature-branch work only: no remote push, merge, deployment, service or scheduler installation, production-pointer activation or re-enabled automation. Two unsupported native window-visibility/focus checks and physical controllers remain manual where skipped. The preview is a session process, not an auto-start service.
