# Staggered defender support — Party5

Base552ad08. User resumed stopped work on2026-11-17. No anthem activation was inferred from Resume; the user's later explicit acceptance of the victory sound board authorised the additional music integration, documented separately in `party5-music.md`.

## Behaviour

In normal outfield-possession, loose-ball and non-emergency opposition phases, two autonomous defenders no longer share the fixed x-depth and wide +/-4.5 rails. The actual nearest defender steps toward the ball side; the other narrows toward the centre with a nominal2.5 canonical-unit depth gap. The stepping cover target moves1.5 units beyond its former rail, constrained to remain3 units behind other autonomous role targets and below canonical x=-5. Target Y follows65% of ball/carrier Y; spare Y follows18%, capped at+/-1.4. Plans are bounded to the field.

Selection uses actual player-to-ball/carrier distance with deterministic ID tie-breaks, not a hardcoded jersey/side. The already-forward player may remain nearest after kickoff even when the ball changes wing; an opposing-wing fixture with symmetric starting players reverses the selected role. The real browser test checks actual distances instead of assuming a particular jersey must step.

Specialised existing active-defence plans remain intact when an opposing carrier enters the team's half: one reachable presser and actual shot/pass-lane screens. Secure keeper possession retains its safe existing formation/no-press rules. A single defender in1-2-1 is not fabricated into a pair. All human seats are excluded before pair planning. A carry/press action is never converted to chasing/cover by the new pair adjustment. No role, keeper/mould, score, input, charge, audio or animation changes are made.

## Evidence

- New canonical wing regressions initially failed: both DEF targets had identical x (gap0). New pair planning made them pass.
- One old five-a-side test deliberately required4 units of lateral DEF separation during a central loose ball. Updated just that phase to require distinct depth and Euclidean spacing instead; midfielder lanes and keeper possession cases retain their original checks.
- Focused tactics run:4 files,57 tests passed (new shape, both wings, actual nearest choice, pure/mirrored/anisotropic-scaled plans, human exclusions,1-2-1, carry/keeper safety, actual60-tick engine movement for both teams and all existing active tackle/pass-screen tests).
- Built-production browser checks pass on both real arrow-key wing dribbles, without simulation injection. Read-only renderer diagnostics expose ball owner alongside existing positions so tests prove home-human possession while actual DEF geometry becomes staggered/central. Browser frames and screenshots retained under `.local-server/verification/party5-defense-focused2`.
- First browser draft assumed one fixed jersey per wing. The positive-wing replay invalidated that assumption because the initially stepping defender was still actually nearest. Corrected the observation to require the advanced defender to be truly nearer the ball, with the other central/deeper; no production relaxation or timeout increase.

Full-source-hashed checks/browser replay and independent Luna/low review are separate final gates, not claimed complete by these focused results. The first full check exposed two additional old engine assertions that required jersey2 to remain on the deep rail. Updated those mirrored scenarios to retain the original deep-spare and midfield-gap safeguards while additionally requiring an advanced defender and actual depth stagger; no production code was relaxed. The revised focused engine/tactics set passes5files/113tests. The failed attempt is preserved under `.local-server/verification/party5-attempt1`; only `shared/engine.test.ts` differed between the first two pre-approval full attempts. Subsequent explicit approval authorised the additional audio-source changes; the old-runtime replay was stopped and preserved before integration. Automatic deployment must remain disabled; preview is manual/loopback-only.
