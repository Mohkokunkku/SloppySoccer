# Charged shooting

Human shooting is hold-and-release: Space / Enter, the standard controller's Circle/B button, or the on-screen shot button. Full charge takes 1200 ms. The visible per-seat meter sits directly below the pitch. Movement/aim remains live while charging. A quick release produces a softer, accurate kick; full charge gives 1.2 times tuned shot power with deterministic angular variation bounded by 0.08 radians. Existing direct-engine, AI and keeper shots retain their old immediate behavior.

`src/local-input.ts` is the compatibility export for `LocalInputHub` in `src/charged-local-input.ts`. The hub records independent source identities and seat clocks. Keyboard/touch down and up edges become chronological action groups. Pad edges are sampled. `LocalInputQueue` preserves those groups across zero-tick RAFs and combines each consumed group with current movement; start edges are never replayed as held state.

The engine authorizes a charge only for a human seat that owns its controlled player and the ball. Explicit releases require that same authorization. Possession loss, changing/removed human controls, passing, shooting, non-playing phases and UI cancellation invalidate it. `cancelShotCharges(state)` is called by the UI clear boundary. The meter never displays another seat's or a former owner's charge.

Tests cover independent keyboards, mixed-source touches, gamepad release/reconnect, clear/assignment boundaries, real hub→queue→fixed-step→engine chronology, bounded power/spread, deterministic replay, legacy shots, and ownership/control invalidation. A real browser keyboard case checks visible charge, release and pause cancellation; it observes renderer diagnostics without injecting game state.

Physical controller input, native OS focus changes and speaker listening still require manual checks. See `party2-verification.md` for coordinator acceptance results.
