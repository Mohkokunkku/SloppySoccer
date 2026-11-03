# Toybox International — player selection board

## Deliverable

Open `public/toybox-concepts.html` directly in a browser, or serve it at `/toybox-concepts.html` using the existing development server. The board is one complete offline HTML file with inline original SVG illustrations, CSS, and JavaScript. No remote assets, fonts, libraries, or build step are required.

**Surface archetype: Compare.** Equal-width columns and aligned illustration, keeper, scale-test, tradeoff, and choice rows keep attention on the differences between the toys. On narrow screens the complete options stack vertically.

## Directions

| Choice | Name | Silhouette and material | Strength | Tradeoff |
| --- | --- | --- | --- | --- |
| A | Touchline Classic | Lean moulded plastic, combed hair, bent arms, separate shaped legs and black boots. Closest to the supplied photograph. | Recognisable reference silhouette; vintage tabletop character. | Fine facial and limb details diminish at small scale. |
| B | Workshop Eleven | Turned beech head, barrel-shaped painted torso, exposed dowel shoulders, cylindrical limbs and oval wooden plinth. | Warm material relationship to the oak board; clear colour blocks. | More rigid posing; plinths deliberately suggest board-game pieces. |
| C | Pocket All-Stars | Oversized soft-touch vinyl head, compact torso, rounded mitts and broad boots. | Distinctive playful silhouette and character. | Oversized heads conceal more of the kit from above. |

Every direction includes:
- Two large front illustrations: Spain red/gold and Argentina white/sky-blue stripes.
- Spain pine-green and Argentina amber keeper variants, with cream glove/mitten colouring.
- Two nominal 44px-high front-view samples, shown at the same display size across directions.
- Material label, concise rationale, advantage, and tradeoff.

The small samples are **front-view readability proxies**, not screenshots or a claim that these models have been implemented in the Three.js camera. All appearances are original toy studies, without licensed toy branding, official team crests, or real-player likenesses.

## Choice behaviour

The initial page has **no selected option**. `Choose A`, `Choose B`, and `Choose C` mark one page-local preference and update an accessible live status message. `Clear preference` restores the neutral state. Nothing is persisted or transmitted. The user confirms their direction by replying A, B, or C in chat.

**No model was installed in gameplay.** This study does not alter the game, packages, configuration, or Git state. Selection and subsequent 3D implementation are separate decisions.

## Verification

Executed with the repository's installed Playwright/Chromium against the actual `file:///D:/SloppySoccer/Game/public/toybox-concepts.html` artifact:
- Desktop viewport: 1440 × 1100; three concept articles and 16 inline SVG elements loaded; no page errors; no horizontal overflow.
- Mobile viewport: 390 × 844; no horizontal overflow.
- Preference selection and reset exercised successfully.
- Desktop screenshot visually inspected: all three silhouettes, red/gold kits, Argentina stripes and coloured keepers render correctly.
- Fixed SVG `<use>` shadow-tree styling during visual QA: use simple class selectors inside symbols and inherited custom properties for team colours/stripe display; avoid descendant selectors that depend on an outer SVG ancestor.

Screenshots were generated outside the repository, in the Hermes scratch directory (`toybox-concepts-desktop.png` and `toybox-concepts-mobile.png`), so this task owns only its two requested deliverable files.

### Design self-audit

Slop diagnostic: **0/10 flagged tells**. The three columns are intentional compare lanes, not generic feature tiles. Packaging windows frame actual original toy illustrations; material-specific highlights and grain belong to the objects. The cream/ink palette and Trebuchet/Arial Black typography continue the existing toy-box vocabulary. No tech-gradient page treatment, icon toppers, accent rails, glass blur, fake statistics, or unrelated promotional content.
