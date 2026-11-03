# Spain's three-character squad

The accepted A1/A2 direction is now implemented as three original, articulated Three.js moulds in one playable team:

| Match identity | Character | Appearance |
|---|---|---|
| home-0 / attacker | A1 Matchday Athlete | Lean adult proportions, fitted kit, clean-shaven face and cropped hair |
| home-1 / midfielder | A3 Midfield Runner | Compact athletic torso, raised textured curls, white headband and wrist tape |
| home-2 / defender | A2 Power Captain | Broader torso and neck, square jaw, wraparound beard and captain's armband |

All three wear Spain's red/gold kit and black boots. Spain's goalkeeper and all Argentina figures keep the existing moulds. These are appearance differences only: player IDs, role AI, movement speed, ball physics, collisions and match timing do not change.

## Architecture
- `src/character-id.ts`: pure team/role-to-character mapping, generated as a small Sol/low proposal and independently tested.
- `src/athletic-figures.ts`: geometry/material factory; type-only FigureRig import prevents a runtime cycle.
- `src/scene.ts`: coordinator-owned dispatch into the athletic or original factory, plus shared walk/celebration posing.
- `src/renderer.ts`: existing role badges use per-mould height anchors; `data-character` exposes the actual rig identity for browser checks. This is not a crowded-label decluttering change.
- `squad.html` and `src/squad-showcase.*`: the exact same runtime figure factory, displayed on a toy shelf. Front/three-quarter/back and individual focus work on desktop and phones. No SVG stand-ins or result writes.

## Preview and verification
After `npm run build`, the local server serves the match at `/`, the squad shelf at `/squad.html`, and real goal rehearsals at `/celebrations.html`.

Coordinator executed `npm run check`: 188 tests across24 files, strict TypeScript, frontend and backend builds passed. The complete production Playwright suite passed13 checks, including rendered character identity in the actual match, live WebGL, all shelf controls, phone layout, a full match with save-once persistence, voice assets/playback and all three goal/reset rehearsals. Production dependency audit reported zero vulnerabilities. Desktop and phone squad screenshots were inspected.

Source remains on `feature/toybox-international`; no merge or main-release activation is implied. The independent final squad review is a separate gate. Existing crowded-marker improvement and catalogue speech-skill installation remain outside this completed cast integration; local voice clips already work.
