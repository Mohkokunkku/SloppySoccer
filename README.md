# Sloppy Soccer
Tiny boots. Big game. A TypeScript tabletop arcade soccer game inspired by the supplied plastic football figure and lattice goal.

## Play locally
Requires Node.js 24+ and npm. From this folder:

```sh
npm ci
npm run check
npm start
```

Open http://127.0.0.1:3000. This is **single-player versus AI**, with three outfield figures **plus a goalkeeper on each side** (eight figures). It is not online multiplayer. Match results are casual local records, not server-verified competition scores.

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

Open `/squad.html` for the actual 3D squad shelf with front/three-quarter/back controls and phone-friendly individual focus. `/celebrations.html` rehearses the three five-second goal dances and visible return to kickoff. The earlier 2D concepts remain at `/toybox-concepts.html` and `/athletic-concepts.html`. Sound is optional: use **Sound on** and **Test sound** in the match. See `docs/spain-squad.md` for architecture and verification.

## Live tuning and presentation preview
`feature/live-tuning-presentation` adds smooth angular response and acceleration, distance-driven running with articulated knees/elbows, displacement-only ball rolling, and an opening run from the two dressing rooms. The match clock stays frozen until all eight players reach kickoff; the entrance can be paused.

Open **Tuning lab** below the pitch to adjust eleven values during play: field length/width, goal width/height, running speed, sprint multiplier, shot/pass/keeper power, acceleration and turning response. Lower acceleration gives a gentler start; lower turning response gives smoother turns. Field geometry, physics, keeper positioning and tactical targets use the same validated settings. Changes preserve score and clock; **Reset tuning** restores defaults. Restart retains the current page's tuning, while reloading returns to defaults.

Audio is off until enabled. Recorded human support cues (“Go!” / “Hurry up!”), impact foley, audience shot reactions and a larger goal cheer replace the old runtime speech/beeps. **Hear crowd** and **Hear goal music** audition the new recordings and original 4.35-second instrumental without changing the score. Pause, mute, hide and restart cancel active and pending audio. See the in-game **Audio credits** and `public/audio-v2/CREDITS.md` for source attribution and licences. Instrumental music is synthesized, not human-recorded.

After building, run an isolated preview without touching production:
```sh
PORT=3002 DATA_DIR="D:/SloppySoccer/Game/.local-server/presentation-preview-data" npm start
```
Open http://127.0.0.1:3002. The preview is a session background process, not a Windows startup service. No merge, push or activation is implied by running it. The architect coordinated mechanics, visual, audio and QA workers, each explicitly pinned to `openai-codex` / `gpt-6.1-sol` / low reasoning; the shared contract is `docs/presentation-tuning-contract.md`.

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

A post-receive hook failure does not roll back Git's accepted push; always check hook output and `current.json`. If deployment fails, old release stays active. A crashed deploy can leave `deploy.lock`; remove it manually only after confirming no deploy is running. No automatic startup service or Windows scheduled task is installed.

`DEPLOY_ROOT` changes the local destination (path or mounted share). `HOST`/`PORT` configure serving. For a different LAN server, first choose its address, access method and target path; this project does not assume SSH credentials or open your network. The GitHub workflow runs CI and uploads build artifacts if you later connect a GitHub repository; it does not claim to have run remotely.

## Architecture and agents
- `shared/`: renderer-independent deterministic TypeScript match simulation.
- `src/`: browser UI, input, Three.js toy renderer.
- `server/`: Fastify API, JSON result repository, production asset serving.
- `scripts/`: tested release helpers, local Git receiver, deployment and supervisor.
- `tests/browser/`: Playwright production smoke tests and screenshot output.
- `docs/agent-team.md`: agent ownership, skills and reusable coordination workflow.

## Scope and safety
Local casual play; no accounts, multiplayer, authoritative anti-cheat, paid assets or cloud services. Keep default loopback binding unless you deliberately configure authentication/TLS/reverse proxy and LAN exposure. JSON storage supports one production server process; don't run multiple writers against the same DATA_DIR. Dependencies are pinned with a lockfile; glob/minimatch overrides address advisories reported by the installed audit registry and should be reviewed when updating packages.
