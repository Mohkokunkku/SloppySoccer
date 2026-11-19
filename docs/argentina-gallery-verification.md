# Argentina model gallery verification

## Scope

Branch: `feature/argentina-adult-model-auditions`, based on `656de3159f1b7ed126fa88df272792eb94b7653c` (fetched main, containing the previous tested work with the same tracked tree).

The user requested adult-looking Argentina alternatives and a choice of four outfield players plus a keeper. This increment supplies **12 original procedural 3D candidates: P01–P10 outfield, K01–K02 goalkeeper**. It is an audition surface, not an automatic squad replacement. Existing squad factories, physics, tactical roles, input, audio, result handling and keeper protections remain unchanged. The only existing configuration change is a Vite entry for `/argentina.html`.

The gallery provides full-body front/three-quarter/profile/back views, face details, orbit/zoom, standing/run/ready poses, and unchanged Spain/current Argentina references at the same world scale. Shortlisting permits exactly four outfield players and one replaceable keeper. Drafts are separately validated/stored in the browser; copying choices is not approval or application to the match. Browser checks verify that result storage is unchanged and no results are submitted.

## Specialist work and corrections

Initial modeling and QA used bounded GPT-6 Luna/low workers with exclusive ownership and actual-model receipts under `.local-server/agents/argentina-auditions/`. After the user connected Codex through ChatGPT, a separate Codex CLI worker received narrow modeling corrections. All Codex calls explicitly requested `gpt-6-luna` and low reasoning without changing Hermes settings or using elevated reasoning.

The coordinator did not accept passing counts as visual proof. Actual rendered prototypes exposed floating stripe plates, same-height bodies, awkward jaw/beard pieces and incorrectly positioned keeper cuffs. A subsequent worker revision passed its weak checks but scaled already-translated head geometry, leaving faces among the legs while eyes/hair floated above. That revision was rejected, not delivered.

The coordinator added failing world-space head location/proportion checks, actual knee/elbow-array guards, sleeve/cuff parenting and independent texture-disposal checks before correction. Final geometry transforms are ordered correctly; features are placed against the modeled head surface, hair/beard colors follow the actual scalp/jaw, torso UVs place stripes on both curved surfaces, and keeper forearms/cuffs articulate with their wrists. All twelve structural geometry signatures are distinct without relying on colors or names.

Failed/intermediate renders and tests remain in ignored verification folders; only `.local-server/verification/argentina-release-renders/` is the approved current capture set. The failed first image-equipped CLI invocation had its prompt consumed by multi-value image arguments; no modeling work from that invocation is claimed. The corrected invocation used an explicit positional delimiter/stdin prompt.

## Established checks

- Focused geometry/draft tests: **2 files / 12 tests passed** (5 geometry, 7 draft-selection).
- Strict TypeScript client/server production build passed. A pre-existing shared Three.js bundle-size warning is not a build failure and was not hidden.
- **5 focused native browser cases passed** after correcting test/UI selector and empty-state wording mismatches. Added stronger empty-draft assertions, face rendering, both keepers, draft persistence, keyboard/mobile and actual results read-back.
- All twelve actual WebGL thumbnails and face captures were produced and inspected. Desktop and 390px mobile captures show complete models and usable controls, with no recorded console/page errors or horizontal overflow.
- Full-body and face contact sheets are composed only from these real captures. `provenance.json` records source-image hashes; there is no generated-image, retouching or real-player-likeness claim.
- Independent fresh **read-only Codex visual/security/code review passed** without confirmed security, logic or material visual defects. A nonblocking suggestion notes that the family could offer stronger torso/limb variation. The review did not authorize integration or replace the user's model choice.
- Staged static scan positive controls passed with zero findings; installed production dependency audit reported zero vulnerabilities.

## Final combined gate

The final source-hashed gate passed on **November 19, 2026**, from **20:22:04.138514 UTC** to **20:37:26.895128 UTC**:

- **571 unit tests / 85 files passed**, plus strict client/server/deployment-runtime builds.
- **72 browser cases: 70 passed, 2 skipped**; zero unexpected or flaky cases and no global errors.
- **258 source/artifact hashes unchanged** during the gate and matching the current tree.
- Read back the final receipt, case totals, independent reviewer verdict and preview correspondences before local commit.
- Quiet preview health passed. `/`, `/victory.html` and `/argentina.html`, plus 19 referenced assets/diagrams, matched the built files. Result history was readable; `SloppySoccer-GitHubDeploy` remained disabled (`Enabled=false`).

Authoritative receipts are in `.local-server/verification/argentina-final/`; current approved captures/contact sheets and source-image provenance are in `.local-server/verification/argentina-release-renders/`. The independent read-only verdict is `.local-server/reviews/argentina-final/verdict.json`.

Native alternate-tab/window-blur audition capabilities and physical controller hardware remain manual where skipped/unsupported. No merge, remote push, deployment, service installation or re-enabling of the disabled Windows deployment task is part of this increment. The preview is a quiet session-managed local process, not an auto-start service.
