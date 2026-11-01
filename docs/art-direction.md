# Sloppy Soccer / art direction

## The reference, observed

The supplied `D:/SloppySoccer/soccer figure.jpg` shows a small dark-uniformed plastic keeper in front of a white rectangular goal. Arms spread asymmetrically; shirt, shorts and tall boots are glossy black; hands, face and bare knees are tan. Hair is short, dark brown, tightly combed. The goal is rigid square lattice, not rope mesh. It sits on a pale warm-gray woodgrain floor. An elevated oblique camera and broad soft light reveal the lattice shadow and rounded plastic highlights. These material/construction cues are retained; the face, geometry, game colors, UI and tabletop composition are original.

## Approved composition

**Workshop inspection sheet**, not a marketing-card grid. `../public/design-board.html` contains original inline vector illustrations: complete eight-player diorama, enlarged molded figure with construction callouts, palette strip, ready-state HUD and motion thumbnails. It is deliberately standalone and opens with no server or external fonts/assets. Print control prints the same sheet.

The largest illustration is the world: low oak tray, inset green pitch, ivory rectangular square-lattice goals, coral and cobalt outfield teams with charcoal keepers. The specimen exposes the reference-derived hair, knees and boots. HUD example is illustrative, not a current match result. Main illustration preserves the player count; perspective in the SVG is a conceptual orthographic 3/4 projection, not physics geometry.

## Integration recipe

1. Use `../DESIGN.md` for exact colors, materials, dimensions and Y-up coordinate mapping. Shared simulation `FIELD` and `GameState` are authoritative.
2. Model one original rounded figure with a reusable torso/head/limb hierarchy. Material-swap coral vs cobalt; both keepers charcoal. Keep face readable without realism. Arms/boot toes should read from above.
3. Build goals as open-front ivory frames with rigid back/side/top rod grids. No opaque goal panel. Match mouth width 7 and depth 2; visual height 3.5. World x ends ±16; goal width spans scene z. Keep goals outside the playable rectangle and within the tray.
4. Use an orthographic camera; fit both goals and the whole tray. Oak surround is visible but does not compete with play. Alternating green stripe variation is subtle, not a striped zebra field.
5. Let ball and yellow player ring win at game scale. The ring has a chevron too; team labels duplicate hue. Skin is warmer than ivory but never luminous. The ball is an ivory sphere with sparse dark patches, with its shadow directly on the pitch even during a hop.
6. Keep the scoreboard compact and outside play. Opaque plastic-like plates, readable timer, short labels. Setup panel uses the same paper/ink vocabulary; no neon/glass dashboard. Respect reduced-motion preferences.

## Motion vocabulary

- Running is a gently tipping solid shell with cycling hips/feet. Arms may swing slightly; do not squash faces or stretch the whole toy.
- A shot is one quick leg action and short recovery. Trail marks, if any, are tiny/brief; never hide the ball.
- Keepers shuffle with arms open. Do not duplicate the outfield arm pose for keepers.
- Goal feedback is one contained celebratory punctuation; no continuous confetti or automatic camera orbit.
- Board art itself is static for careful inspection; the motion row is a visual storyboard, not a CSS animation.

## Design review

The brief already selected the strong-fit direction, so the board consolidates one complete treatment instead of presenting superficial color variants. Oak/paper are contextual workshop materials, not a generic editorial cream/serif template. Large black/coral compressed lettering is packaging-inspired, paired with a local humanist UI sans.

Slop audit: **0/10** of the claude-design diagnostic tells. No tech gradients, indigo default, feature-tile grid, accent rails, glass, decorative statistics, icon toppers, center stack, default Inter type or wrong-surface composition. Material highlight gradients inside the SVG are intentional toy shading, not page decoration.

## Deliverables and boundary

- `public/design-board.html`: self-contained original illustrated art sheet; responsive and printable.
- `DESIGN.md`: renderer-ready normative palette plus geometry, camera, HUD and motion specifications.
- `docs/art-direction.md`: reference analysis, integration recipe and design rationale.
- `docs/design-tokens.json`: portable palette/material/geometry values for frontend integration; no build import required.
- `public/design-board-preview.png`: actual full-page desktop browser capture of the board.

## Verification

Opened the local file in a real Chromium browser at 1440px desktop width and 390px mobile width. Both layouts fit with no horizontal overflow. Browser parsed 48 CSS rules; resource performance entries were empty (no remote assets). Desktop and mobile screenshots were inspected. The desktop capture is included above.

Python standard-library checks passed: HTMLParser completed; all four inline SVG blocks parsed as XML; 11 IDs are unique and all 23 SVG references resolve; the main scene contains exactly eight toy instances; token JSON parses. Measured normal-text contrast: ink/paper 13.92:1, ink/coral 4.75:1, paper/cobalt 4.79:1, muted/paper 6.13:1. This is static artifact verification, not a gameplay or full accessibility audit. No package install or runtime build was needed.

No runtime files, simulation, server, packages or shared contracts are modified. No brands, paid assets, generated photography or remote requests are needed.
