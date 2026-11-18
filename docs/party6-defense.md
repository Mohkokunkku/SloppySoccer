# Wide defensive line and forecheck cover correction

Base08eed2d;2026-11-17. User rejected the central/narrow shape and clarified that both defenders were converging on the attacker. New requirement supersedes Party5's narrow support assertions: maintain a broad side-by-side line with a small offset, but when one forechecks the partner must stay genuinely behind.

## Root causes and policy

The former normal pair reduced lateral separation to0–2.82 canonical units with2.5 units of depth gap. Active cover could sit only2.68 units behind a wing carrier, while two-cover shot/pass targets could be just1.8 units apart. A different action label did not prevent their actual convergence. Also, a human defender already challenging the carrier was excluded from AI selection, so the AI partner could incorrectly become another forechecker.

- Normal paired support: retain opposite lanes,7.6 canonical units apart; shift the whole line slightly with ball Y, capped+/-1.3. Nearest defender has only+.45 depth bias, partner-.45:0.9 total, not the old2.5 deep/narrow stagger. Both stay behind midfield support.
- AI defender forechecking: leave the one presser's actual chase target intact. Partner targets4.5 canonical units goal-side of the carrier/press target, on the carrier-to-goal lane. It does not move to another almost-identical tackle target.
- Human defender within2.5 canonical units of a live outfield/loose ball: regard that player as the current challenger without issuing any human intent; AI partner supplies the same deeper cover and no second AI presser is selected.
- Midfielder/attacker pressing: defenders hold the broad goal-side line instead of both joining pressure.
- Near own end line, clamp depth to the pitch; if there is not enough room to drop, cover the other lane rather than crowd the same challenge or leave the pitch. Secure keeper possession and the single-defender1-2-1 formation retain existing behavior. Incidental interceptions are still allowed; no fake ban on a cover player touching a ball that comes to them.

No engine physics, human input, keeper cooldown, player role/mould, sound, approved music or result-saving changes. Plans remain pure, team-mirrored and field-scaled.

## Regression evidence and test corrections

New width/forecheck regressions initially6/6RED against08eed2d, including actual target spacing and deeper cover. After the pair correction, a new human-forechecker case also failed RED (AI still selected another presser); the near-human pressure guard fixed it. Mirrored15-tick engine tests verify that the forechecker actually advances while the spare moves backward before possession changes, not just correct labels.

Old Party5 assertions demanding a narrow central spare, depthgap>1.8 and close pass-screen points were intentionally replaced with wide support/small-offset/deeper-cover checks. Deep-cover, midfield-gap, purity/scaling, human exclusions, keeper protection and real tackle-win safeguards are retained. Focused engine/tactics set:7files129tests passed before final gate.

Luna/low QA added7stress tests. Its initial loose-ball fixture was itself a defender forecheck but required a shallow normal line. Coordinator made the normal-loose fixture midfield-owned pressure and explicitly verifies no DEF is pressing, preserving separate mirrored forecheck tests. Normal width was strengthened from3 to6; real-engine case strengthened from an initial-geometry observation to actual opposite-direction movement.

Real built-game keyboard checks pass on both wing dribbles for width/small offset and on a wing attack for separate goal-side cover. The first browser draft kept sprinting to the end line (outrunning Easy AI), then incorrectly assumed a defender must be the nearest forechecker. Retained traces show legitimate attacker/midfielder pressure instead. Final test stops using real controls on the wing and observes either actual DEF forecheck with a deeper partner or non-DEF pressure with BOTH defenders wide and deeper. No simulation injection, timeout increase or production relaxation was used. Failed focused attempts preserved; passing screenshots/evidence in `.local-server/verification/party6-focused3`.

Full source-hashed check/browser replay and independent review are separate gates; no full-suite claim until final receipts exist. Automatic deployment remains disabled; all publication is local feature-branch work unless separately requested.
