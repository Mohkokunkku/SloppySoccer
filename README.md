# Sloppy Soccer
Tiny boots. Big game. A TypeScript tabletop arcade soccer game inspired by the supplied plastic football figure and lattice goal.

## Play locally
Requires Node.js 24+ and npm. From this folder:

```sh
npm ci
npm run check
npm start
```

Open http://127.0.0.1:3000. This supports **one to four local human players** sharing one screen, on the same team or opposing teams, with **four outfield figures plus a goalkeeper per side** (ten figures). Unassigned players are AI-controlled. It is not online multiplayer. Match results are casual local records, not server-verified competition scores.

## Role-based AI branch
`feature/role-based-ai` adds persistent attacker/midfielder/defender roles. One AI chases or presses; the attacker seeks a clear forward passing lane, midfield screens/connects play, and defense stays underneath. Settled support players stop inside a deadzone; tactical targets refresh every0.2seconds, with immediate replanning after possession/control changes. User movement and the keeper jam fix remain intact.

The selected role is shown under the pitch; hover its label for a short role hint. Frontend code proposals use `gpt-6.1-sol` with low reasoning. Local Ollama workers are disabled and are not automatic fallbacks. See `agents/README.md`.

For an isolated Windows Git-Bash preview after `npm run build`:
```sh
PORT=3001 DATA_DIR="D:/SloppySoccer/Game/.local-server/role-preview-data" npm start
```
Open http://127.0.0.1:3001. This does not merge or deploy the branch to main.

## Spain's mixed squad
`feature/toybox-international` uses three distinct sporty adult toy moulds in Spain's outfield: **A1 Matchday Athlete** as attacker, **A3 Midfield Runner** as midfielder, and **A2 Power Captain** as defender. Spain's goalkeeper and Argentina retain their original figures. The changes are cosmetic; role AI and physics are unchanged by the character factory.

Open `/squad.html` for the actual 3D squad shelf with front/three-quarter/back controls and phone-friendly individual focus. `/celebrations.html` rehearses all five five-second goal dances and visible return to kickoff. The earlier 2D concepts remain at `/toybox-concepts.html` and `/athletic-concepts.html`. Sound is optional: use **Sound on** and **Test sound** in the match. See `docs/spain-squad.md` for architecture and verification.

## Live tuning and presentation preview
`feature/live-tuning-presentation` adds smooth angular response and acceleration, distance-driven running with articulated knees/elbows, displacement-only ball rolling, and an opening run from the two dressing rooms. The match clock stays frozen through the ten-player entrance and the new team spotlight; both can be paused.

Open **Tuning lab** below the pitch to adjust eleven values during play: field length/width, goal width/height, running speed, sprint multiplier, shot/pass/keeper power, acceleration and turning response. Lower acceleration gives a gentler start; lower turning response gives smoother turns. Field geometry, physics, keeper positioning and tactical targets use the same validated settings. Changes preserve score and clock; **Reset tuning** restores defaults. Restart retains the current page's tuning, while reloading returns to defaults.

Audio is off until enabled. Recorded human support cues (“Go!” / “Hurry up!”), impact foley, audience shot reactions and a larger goal cheer replace the old runtime speech/beeps. **Hear crowd** and **Hear goal music** audition the new recordings and original 4.35-second instrumental without changing the score. Pause, mute, hide and restart cancel active and pending audio. See the in-game **Audio credits** and `public/audio-v2/CREDITS.md` for source attribution and licences. Instrumental music is synthesized, not human-recorded.

After building, run an isolated preview without touching production:
```sh
PORT=3002 DATA_DIR="D:/SloppySoccer/Game/.local-server/presentation-preview-data" npm start
```
Open http://127.0.0.1:3002. The preview is a session background process, not a Windows startup service. No merge, push or activation is implied by running it. The architect coordinated mechanics, visual, audio and QA workers, each explicitly pinned to `openai-codex` / `gpt-6.1-sol` / low reasoning; the shared contract is `docs/presentation-tuning-contract.md`.

## Local party, formations and match intro
`feature/local-multiplayer-formations` preserves the preceding presentation work and adds independent **Spain tactic** and **Argentina tactic** choices: **2 defenders / 1 midfielder / 1 attacker** or **1 defender / 2 midfielders / 1 attacker**, plus each team's goalkeeper. Bots use the selected roles, distinct support lanes and one presser; every human-controlled figure is excluded from AI movement/actions. The fourth Spain outfielder uses the existing A2 defender or A3 midfielder mould for its role; keepers retain their original identity.

Enable up to four rows in **Local players**, choose each team and a unique device, then start. Two people can share a keyboard; additional seats use detected standard-mapped gamepads. Any mixture of co-op and opposing seats is allowed, including four humans on one team. Colored rings and separate P1–P4 badges identify ownership. **Change players** abandons the current match and returns to setup; it does not save an unfinished score.

| Device | Move | Shoot | Pass | Switch | Sprint | Pause |
|---|---|---|---|---|---|---|
| Keyboard 1 | WASD | Space | E | Q | Left Shift | Esc |
| Keyboard 2 | Arrow keys | Enter | / | . | Right Shift | Esc |
| Standard PlayStation mapping | Left stick | Circle | Cross | L1 | R2 | Options |

With no Keyboard 2 seat, Keyboard 1 also accepts arrows and Right Shift. On-screen touch controls supplement the first seat. Connect controllers by USB/Bluetooth and press a button to make them visible to the browser. Only standard-mapped controllers are accepted; unmapped or disconnected devices are labeled honestly. An active controller disconnect pauses the match. Reconnect and resume, or choose **Change players** to select another device. Browser/logic tests are not physical Sony controller certification; the manual checklist is in `docs/local-party-qa.md`.

After the dressing-room entrance, a 6.5-second in-engine film shows both teams' faces and welcome dances, then lifts into the wide match camera. The clock and ball stay frozen until kickoff. **Skip intro** uses the normal game transition; reduced-motion mode provides a static wide reveal. Every goal dance now travels across the tabletop as well as animating limbs: Boot bounce, Windmill wave, Toy shuffle, **Victory orbit**, and **Heel-toe slide**. Pausing freezes presentation; reduced motion removes travel/hopping/spinning.

After building, use an isolated Windows Git-Bash preview:
```sh
PORT=3003 DATA_DIR="D:/SloppySoccer/Game/.local-server/party-preview-data" npm start
```
The design/ownership contract is `docs/local-party-contract.md`. Verification evidence and remaining acceptance limits are documented separately; authored tests and worker exit codes do not imply final acceptance.

## Development
```sh
npm run dev:server   # API on localhost:3000
npm run dev          # game on localhost:5173, proxies /api
npm test             # frontend, mechanics, server and deployment unit tests
npm run build        # strict typecheck + browser and server build
npx playwright install chromium
npm run test:e2e     # production-browser checks, after building
npm audit --omit=dev
```
No external image or font service is needed during play. Assets are original procedural toy geometry. The graphical design board is at `/design-board.html` once served; see DESIGN.md and docs/art-direction.md.

## Local Git and continuous delivery
The initial target is this PC, bound to **127.0.0.1 only**. No firewall changes, public upload, account or credentials are needed.

```sh
npm run setup:local-cd  # bare local Git remote and post-receive hook
# after making a commit:
git push local main    # deploys the exact pushed commit after checks
npm run serve:local    # production supervisor on localhost:3000
```

The pipeline exports the pushed commit to `.local-server/builds`, runs locked install, unit tests, strict build, browser tests and dependency audit, then packages `dist`/`dist-server` into an isolated `.local-server/releases/<id>` with production dependencies. A candidate starts on a temporary loopback port and must pass health and page checks before atomic activation in `.local-server/current.json`. The running supervisor reloads after activation. Results live outside releases in `.local-server/data` so deployments preserve them. Existing releases remain for rollback:

```sh
npm run rollback:local
# or deploy the current working tree manually:
npm run deploy:local
```

A post-receive hook failure does not roll back Git's accepted push; always check hook output and `current.json`. If deployment fails, old release stays active. A crashed legacy deploy can leave `deploy.lock`; remove it manually only after confirming no deploy is running. The production supervisor is not a Windows service. The separate GitHub watcher installer below is optional and does not start the HTTP supervisor.

`DEPLOY_ROOT` changes the local destination (path or mounted share). `HOST`/`PORT` configure serving. For a different LAN server, first choose its address, access method and target path; this project does not assume SSH credentials or open your network. The GitHub repository is `Mohkokunkku/SloppySoccer`. GitHub-hosted **Verify game** CI runs on pushes and pull requests. The optional outbound watcher on this Windows PC deploys only a successful main-push SHA that still matches current `origin/main`, through the existing immutable local CD pipeline. PR approval alone is not merge; merging/pushing main triggers verification, and deployment follows only after success. No public self-hosted runner or inbound firewall opening is needed.

See `docs/github-deployment.md` for installation, recovery, trust rules and uninstall. `npm run build:deploy` compiles the standalone TypeScript watcher. Its explicitly installed Scheduled Task runs every two minutes while this PC is awake and the user is logged in; the first invocation records a baseline without deploying it. Keep `npm run serve:local` running for the activated game to be served. A generated workflow is not proof that a remote run or target activation succeeded.

## Architecture and agents
- `shared/`: renderer-independent deterministic TypeScript match simulation.
- `src/`: browser UI, input, Three.js toy renderer.
- `server/`: Fastify API, JSON result repository, production asset serving.
- `scripts/`: tested release helpers, local Git receiver, deployment and supervisor.
- `tests/browser/`: Playwright production smoke tests and screenshot output.
- `docs/agent-team.md`: agent ownership, skills and reusable coordination workflow.

## Scope and safety
Local casual play; no accounts, online multiplayer, authoritative anti-cheat, paid assets or cloud game services. Keep default loopback binding unless you deliberately configure authentication/TLS/reverse proxy and LAN exposure. JSON storage supports one production server process; don't run multiple writers against the same DATA_DIR. Dependencies are pinned with a lockfile; glob/minimatch overrides address advisories reported by the installed audit registry and should be reviewed when updating packages.
