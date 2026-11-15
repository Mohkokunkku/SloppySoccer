# Handshake implementation and verification

The initial specialist handed off an incomplete solver (4/12 tests passing); the coordinator completed integration and corrected the solver before delivery. That initial handoff was not accepted as a pass.

- `handshakeLayout` pairs stable sorted home/away IDs, including `home-3`/`away-3` keepers, without rearranging simulation players.
- `poseHandshakePair` finds the real hand inside the articulated elbow and solves two connected rigid arm segments in the shoulder parent's coordinate system. Both right palms move toward a shared reachable target, with a subtle synchronized pump. No fake hands, scaling or stretched moulds.
- `poseFigure` resets secondary arm/elbow axes so intro, goals, rematches and inactive presentation restore normal poses.
- The original three-theme party lasts 16 seconds, followed by a two-second approach and four-second greeting. Total winner presentation is 22 seconds; neutral draws remain eight. Either team can win. Finished simulation, scores, physics and save-once semantics remain unchanged.
- All five pairs are framed by a wide elevated handshake camera. An actual screenshot exposed cropped heads in the initial camera; a whole-mould projection regression was RED before the camera correction and GREEN afterward. No label spacing was changed.
- Pause freezes camera, roots and hands. Reduced motion uses static contact and the existing wide camera. Skip/rematch restore normal poses.

Focused real-rig tests passed after correction, including all roster pairs, hand contact, synchronized pump, unchanged segment lengths/scales and reduced-motion/reset behavior. Both home-winning and away-winning browser rehearsals passed with five actual contact diagnostics, pause/final completion and unchanged backend results. Final full-suite counts and source-hash evidence are recorded separately in `party3-verification.md`.
