# Five-dance handoff

Files: src/celebrations.ts, src/celebrations.test.ts, src/scene.ts, src/moving-dances.test.ts, src/celebration-demo.ts, celebrations.html, docs/five-dances.md.

Implemented: stable Boot bounce / Windmill wave / Toy shuffle, plus Victory orbit / Heel-toe slide; five-style goal cycle. Every style samples bounded x/z travel and animated limbs using per-player phase offsets. poseFigure resets from player coordinates on every call, adds side to scene x and forward to scene z, never changes simulation state. Reduced motion has static raised arms and zero travel/hop/spin. Existing neutral/root/body/limb/knee/elbow resets and tabletop/entrance/camera APIs remain intact. Demo exposes five buttons and #demo-status data-dance-style, data-dance-name plus existing data-phase.

Strict TDD evidence:
- node node_modules/vitest/vitest.mjs run src/celebrations.test.ts src/moving-dances.test.ts
  RED: 33 failed, 1 passed (missing styles/forward/travel). Neutral numerical assertions subsequently use approximate zero to accept equivalent -0.
  GREEN after implementation: 34 passed, 2 files.
- node node_modules/vitest/vitest.mjs run src/celebrations.test.ts
  Demo RED: 1 failed, 3 passed (missing fourth/fifth button).
- Final: node node_modules/vitest/vitest.mjs run src/celebrations.test.ts src/moving-dances.test.ts
  GREEN: 35 passed, 2 files.

Coverage: all five styles move on both planar axes, distinct individual phases, bounded finite samples through 6.5 seconds; all five styles work with original, A1/A3/A2 athletic and keeper rigs; repeated frozen-time calls do not drift; reduced motion and cheer exit restore roots/joints without mutating players. Demo test is source/markup verification, not browser execution.

Remaining integration contracts:
- Cinematic owner supplies poseFigure cheer {style,seconds,index}; indices modulo five per team. Freeze seconds while paused. Absolute sampling supports intro durations beyond five seconds.
- Renderer must position markers, shadows, selection rings and labels from rig.root.position after posing (x/z now include dance offsets), and publish actual rendered positions and dance-style diagnostics. No renderer edits made here.
- Coordinator/QA must run integrated browser verification after concurrent writers finish, including all five demo buttons, goal/reset behavior, paused/reduced-motion presentation and ten-player layout. Demo placement already iterates actual team players by stable numeric ID; no index-based keeper detection was present.
- Engine retains real five-second goal/reset transitions and total-score style selection. No engine/types/UI/dependency/config changes, builds, browser suites, commits or deployment performed.
