# Post-match cinematic rendering

`ToyRenderer.render(state, now, paused, postMatch)` accepts the optional presentation view supplied by the match director. The simulation remains in `finished`; this layer only changes figure poses, face expressions, camera framing and host diagnostic datasets. An active view animates irrespective of the finished simulation phase; pausing freezes both pose and camera transforms. Inactive rendering returns to the standard camera and existing pose path.

The view's `winner`, `theme`, `elapsed`, and `segment` select the winner/loser subject and camera progression. Diagnostics: `postMatchActive`, `postMatchTheme`, `postMatchSegment`, and `postMatchWinner` on the host element.

Reduced-motion preference keeps a wide, non-sweeping camera and uses static poses. Draws have no winner and remain neutral. No game state values are modified.

The integrated `PostMatchDirector` snapshots the score and selects one of three themes once: Golden Boot, The Grandstand, or After the Whistle. Winner parties last 16 seconds (winner spotlights 0–6, frustrated opponents 6–9, sweeping finale 9–16); neutral draws last 8 seconds. The themes use different layouts and dance styles. Winner smiles and loser frowns use visible curved mouth geometry while preserving the original mould and restoring its neutral mouth afterward. Cameras target transformed real face surfaces.

`victory.html` is an explicit rehearsal with frozen example scores, the same director/renderer/audio, three theme buttons, either winning team, a draw, pause and skip. It saves no results and is not evidence of naturally finishing a match; that has separate production-game coverage.

Focused unit and real-browser checks cover all three themes, both winning teams, moving poses, face framing, loser/finale segments, pause, skip, neutral draws, reduced motion and native sample decoding/playback. Final coordinator results are in `party2-verification.md`.
