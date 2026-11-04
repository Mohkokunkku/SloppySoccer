# Visual motion and live tabletop tuning

Ownership: presentation only. No simulation writes, dependencies, configuration, commits or deployment changes.

## Implementation

- `src/locomotion.ts`: per-rig actual-displacement stride (2.6 units per cycle), exponential acceleration/deceleration blend, opposing arms/legs, gentle forward lean and bob. Large discontinuities do not advance stride. Reduced motion removes the secondary pose animation.
- `src/scene.ts`: optional GameTuning on buildTabletop/cameraBounds, preserving default dimensions and framing. Pitch/stripes/markings/flags/surround/plinth follow field dimensions; separately constructed goals follow goal width/height while retaining constant depth. A warm oak queue deck supports two team-colored dressing-room doorways centered at x=-2/+2, scene z=fieldHeight/2+2. Named door groups carry plain userData labels; no inline scripts or external assets.
- `poseFigure` retains its signature and celebration behavior. Standalone legacy callers bootstrap their first pose from velocity when no previous position exists. ToyRenderer seeds actual position baselines, so live motion always follows observed distance, including entry movement while the simulation clock is frozen.
- `src/ball-motion.ts`: planar displacement drives rolling, never velocity. Stationary, paused, reduced-motion and non-playing frames cannot add rotation. Phase changes and displacement discontinuities reset position baselines. Geometry rebuild also resets the baseline.
- `src/renderer.ts`: only the four geometry dimensions trigger a board replacement; movement/power changes do not. Replacement releases owned geometries, instanced buffers, materials and textures without releasing shared figure/football resources. Figures and role markers are retained. Pausing skips posing and freezes ball, shadows and selector transforms. Existing marker layout is unchanged.
- Readonly host dataset diagnostics expose phase, dimensions, ball position/rotation, first-rig stride phase, number still heading to their kickoff position, and geometry rebuild count (initial construction excluded). `data-frames-rendered` comes from the native WebGL renderer frame counter. Static ready/paused/finished frames are cached until resize, geometry, state identity or display-mode changes; playing and entrance remain animated. Secondary knee and elbow pivots preserve all moulds’ neutral geometry while giving running a bent-knee recovery and bent-arm counter-swing; reduced-motion and goal dances restore neutral secondary joints.

## Verification

Focused TDD: initial run failed for missing motion modules, unchanged pitch dimensions and missing board cleanup. Additional regressions were observed failing for paused ball translation, standalone pose compatibility and unreleased instanced buffers before fixes.

Command:
`node node_modules/vitest/vitest.mjs run src/locomotion.test.ts src/ball-motion.test.ts src/table-tuning.test.ts`

Renderer tests use actual Three.js scene geometry with mocked WebGL/DOM boundaries. They exercise entry/pause, geometry-only rebuilds, rig retention and ball spin. These are not production-browser or GPU validation. Coordinator owns full typecheck/build/existing-suite integration; QA owns production browser checks. No full build or production service action was run.

Known limits: displacement greater than two units between rendered ball samples is treated as a teleport rather than rolled. Labels are semantic mesh names/userData, not browser text overlays. Camera framing retains the existing orthographic orientation and expands with field dimensions; final desktop/mobile visual approval remains a browser-QA task.
