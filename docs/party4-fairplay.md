# Fair-play line

The fixed one-partner ending was replaced by two passing team lines. Each of five Spain players greets every one of five Argentina players: 25 distinct cross-team encounters, including keepers. The sequence is identical for either winning side and is also shown after a neutral draw.

## Motion and contact

- Stable sorted player IDs define two opposing lines. Nine diagonal encounter waves let the lines pass one another continuously without cyclic wrap/teleports or duplicate simultaneous partners.
- The first two seconds blend out of the preceding presentation. Each 1.6-second wave includes a short walking advance, eased turn/reach, a full-contact plateau with small hand pumps, and eased release. Both lines then walk apart. The fair-play segment lasts 18 seconds.
- Real right-arm shoulder/elbow pivots and actual palm meshes are solved without limb scaling. A small stagger aligns shoulders, avoiding the old stretched diagonal reach. Reach/release blends from the normal pose with separate quaternion snapshots, not aliased interpolation targets.
- Keeper arms lower from the save pose; walking swing and bounce are relaxed. All players keep their original moulds and roles. State, physics, score and results are not modified.
- The camera follows the line from an elevated side angle and fits the complete actual figure bounds. Tactical-label spacing is unchanged. Pause freezes roots, hands and camera. Reduced motion uses fixed poses within each encounter and the existing wide camera.

The original winner-party sequence stays 16 seconds before fair play, for 34 seconds total. Draws stay neutral for eight seconds before the same line, for 26 seconds total. Skip remains available throughout; restart/rematch restore ordinary poses.

## Verification

The animation specialist handed off incomplete work; it was not accepted as passing. Coordinator tests first reproduced only-five-contact/static-position failures and then verified continuous line travel, exactly 25 unique pairings, every player's five opponents, actual rigid-palm proximity, pause, both winning sides and draws. The renderer's completed-pairs counter records measured full-strength palm contact, not just planned timestamps. Tests also check unchanged state, full-mould camera bounds and relaxed keeper arms.

Real browser rehearsals reached all 25 contacts for Spain-winning, Argentina-winning and reduced-motion draw cases, verified pause and unchanged results storage, and retained actual videos. Early/middle/late recorded frames were inspected for line progression, connected arms, original figures and framing. Final source-hashed suite details are in `party4-verification.md` and ignored receipts under `.local-server/verification/party4/`.
