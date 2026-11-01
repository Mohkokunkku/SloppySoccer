---
version: alpha
name: Sloppy Soccer Toy Workshop
description: Original satin-plastic football toys on an oak tabletop diorama.
colors:
  primary: "#262925"
  paper: "#FFF8E9"
  ivory: "#FFF3D6"
  home: "#EF6855"
  away: "#356BCE"
  pitch: "#377B55"
  pitchStripe: "#3F835D"
  pitchEdge: "#286044"
  oak: "#BD9165"
  oakEdge: "#8B603C"
  keeper: "#282D32"
  skin: "#DBA978"
  hair: "#392C27"
  boots: "#171D22"
  selection: "#FFE183"
  muted: "#625E51"
  rule: "#D7CBB6"
typography:
  h1:
    fontFamily: Arial Black
    fontSize: 72px
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: "-0.06em"
  body-md:
    fontFamily: Trebuchet MS
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  score:
    fontFamily: Trebuchet MS
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1
rounded:
  sm: 4px
  md: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: 12px
    height: 48px
  button-primary-hover:
    backgroundColor: "{colors.pitchEdge}"
    textColor: "{colors.paper}"
  hud-home:
    backgroundColor: "{colors.home}"
    textColor: "{colors.primary}"
    padding: 12px
  hud-away:
    backgroundColor: "{colors.away}"
    textColor: "{colors.paper}"
    padding: 12px
  hud-clock:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    padding: 12px
---

## Overview

A miniature physical football set, not a stadium simulator. Eight satin-plastic toys, an inset green pitch, rigid ivory lattice goals and warm oak. Strong-fit direction is locked; `public/design-board.html` is the self-contained illustrated target, not a live gameplay view. All geometry is original and procedural.

## Colors

Use the normative hex tokens above. Coral home and cobalt away outfield kits; both keepers charcoal, distinguished by position and optional small coral/cobalt cuff. Flesh-tone heads/hands/knees, molded brown hair caps and black boots. Ivory markings. Selection is pale yellow, never team-colored. Neutral ink on coral; paper on cobalt. Do not put white small text on coral.

## Typography

Local font stacks only: display `"Arial Black", Impact, sans-serif`; interface `"Trebuchet MS", Arial, sans-serif`. Display title deliberately tight and slightly off-square. Body 16px; secondary UI 14px minimum; tabular clock numerals, 28px score. Avoid tracked all-caps labels and mono-text control panels.

## Layout

Fixed orthographic 3/4 camera. Scene uses Y-up: simulation `(x,y)` becomes scene `(x,0,y)`; ball simulation `z` becomes scene Y. Suggested camera `(25,29,34)`, target `(0,0,0)`, vertical orthographic span 31 at desktop; horizontal span follows aspect. Fit the complete 36 × 24 tray plus goals at all sizes: `verticalSpan = max(31, 44/aspect)` is a conservative fallback. Do not crop either goal. Mobile can be wider-framed, not a perspective camera.

Keep pitch unobscured. Desktop top-center scoreboard, bottom controls in an ivory strip; setup/results are compact workshop labels over the tabletop margins. Title on start/end only. Three outfield + one keeper per side, exactly eight figures.

## Elevation & Depth

One broad warm-neutral directional key at `(-12,24,10)`, neutral hemisphere fill. Soft real contact shadows, no black ambient blanket. Board top Y = -0.10, pitch Y = 0.00, marking Y = 0.012; selection Y = 0.025. Tray thickness 0.45. Pitch roughness 0.85, oak 0.72, skin 0.5, kit 0.32, boots 0.28, ivory goal 0.38; metalness 0 for all. Linear material values are Three.js roughness defaults, hex colors are sRGB authoring values. Fine seams/highlight bands, not wet chrome. Ground ball shadow follows `(x,0.03,y)`, shrinking/fading modestly with ball height.

## Shapes

World-unit model specification; simulation constants remain authoritative:

| Part | Size / center | Notes |
|---|---|---|
| Playable pitch | 32 × 20 | x ±16; scene z ±10 |
| Oak tray | 36 × 24 × 0.45 | Rounded corners 0.6; warm edge, no advertising |
| Goal mouth | width 7, height 3.5 | At x ±16, centered z=0; depth 2 outward |
| Goal posts | radius 0.10 | Ivory square frame; no sagging net |
| Lattice | rod radius 0.035; cells about 0.5 | Rigid rods on back/sides/top; keep front open |
| Toy total | height 3.20; body width 0.95 | Collision radius 0.62 unchanged; mesh may overhang |
| Head | radius 0.32; height 0.55; center Y=2.78 | Soft oval, dark hair cap + three comb grooves |
| Torso | width 0.88; depth 0.52; height 0.88; center Y=2.02 | Rounded tapered barrel; tiny collar |
| Shorts | width 0.82; depth 0.53; height 0.43; center Y=1.40 | Split leg shapes; black or matching kit |
| Knees/legs | radius 0.115; exposed length 0.38 | Visible skin between shorts and boots |
| Boots | each 0.27 × 0.58 × 0.42 | Black; long shaft, rounded toe; sole at Y=0 |
| Arms | radius 0.13; upper/lower lengths 0.43 / 0.40 | Keeper spread ±70°; runners rest ±20° |
| Ball | radius 0.28 | Ivory with sparse charcoal patches |
| Selection | outer radius 0.84, inner 0.74 | Pale yellow ring + downward chevron; no pulsing |

Prefer rounded boxes, capsules, spheres and cylinders. Basic clear face: two dark eye ticks and a subtle nose; no detailed celebrity face. Broad highlight on one side is enough. Goal depth extends outside play surface but stays within tray length.

## Components

Scoreboard: `Coral 0 | 2:00 | 0 Cobalt`, backed by opaque compact team/clock plates. Text labels duplicate team color. Minimum interactive target 44px (48px primary). Focus outline 3px cobalt on paper; use ivory ring over dark controls. Disabled controls retain readable labels. Use sentence-case verbs: Play, Restart, Pause, Resume. All state copy follows `GameState.phase`: ready, playing, goal, finished. Timer derives from `timeRemaining`; score derives from `score`, never hardcode mockup values.

Motion: outfield torso lean capped 7°, run cycle 7–9Hz at full sprint, feet ±25°. Keeper small lateral shuffle, arms spread; no full ragdoll. Kick leg snap 120ms, recover 160ms. Goal burst 350ms, modest ivory/coral/cobalt pieces then clear. Score pop 140ms scale 1→1.12→1. Goal camera shake optional ≤0.1 world units, ≤180ms; reduced motion disables it and decorative bursts. Cosmetic motions must not alter physics or ball ownership.

## Do's and Don'ts

- Do prioritize ball visibility, clear goal mouths and a grounded toy silhouette.
- Do keep the home attack direction +x and map only in the renderer.
- Do keep colors and proportions consistent across the game and setup screens.
- Do use shadows to show height; ball size stays stable under orthographic projection.
- Don't add stadium crowds, glossy UI glass, neon effects, licensed marks or remote assets.
- Don't change shared field constants to match the illustration; the SVG is an art-direction projection.
