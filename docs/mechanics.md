# Arcade match mechanics

`shared/engine.ts` owns all simulation; Three.js is presentation only. Public API: `createGame(config?)`, `startGame(state)`, `stepGame(state,input,dt,config?)`. The engine mutates one GameState in place. Call at fixed 1/60-second steps; invalid/negative time is ignored and large deltas are capped at 0.1 seconds. Duration is finite and positive up to 600 seconds; browser presets are 60/120/180. Replay is deterministic for the same input sequence.

## Rules
- Three outfield figures and one goalkeeper on each side. Home/coral attacks +x; away/cobalt attacks -x.
- Pitch is 32 by 20. Touchlines and end boards rebound the ball. Goal mouth is 7 wide. No offside, throw-ins, fouls or penalty kicks.
- Ready and finished states are frozen. Goals require the whole ball to cross the line within the mouth. Celebration lasts 1.5 seconds and pauses the clock; conceding team receives the next kickoff.
- Move with WASD/arrows, shoot with Space, pass with E, switch with Q, sprint with Shift. Sprint spends stamina; walking/rest restores it. Diagonal speed is capped.
- Shoot/pass/switch are edge-triggered. Aim follows movement or the toy's facing; forward shots have light goal assistance. Pass chooses an outfield teammate in the indicated direction and transfers player control to the intended receiver.
- Low nearby balls can be collected; the kicker cannot immediately recapture a shot. An opponent can steal a carried ball by reaching it; a brief possession shield prevents repeated frame-by-frame ping-pong tackles.
- Ball movement has ground/air drag, gravity, small hops and damped bounces. It is an arcade approximation, not a professional rigid-body soccer simulation.

## AI
Uncontrolled teammates find passing/support lanes. Opponents chase possession or the free ball. AI carriers advance, pass when a teammate is forward, and shoot within range. Difficulty changes opponent movement and goalkeeper speed. Both goalkeepers track a short ball-trajectory prediction within the mouth, catch low shots and clear forward. Keeper control is always automatic.

## Tested behavior
Team counts/unique IDs; lifecycle and clock; movement/diagonal cap; sprint/recovery; possession, tackles and recapture lock; shooting/aim assist/pass/switch edges; both goal directions and whole-ball rule; side/post/end rebounds; celebration/reset; ball drag/bounce; home/away AI shots; support/chasing; keeper tracking/save/clear; invalid durations/timestep; deterministic replay. See `shared/engine.test.ts` for executable acceptance criteria.

Hidden input/cooldown state is held in a WeakMap keyed by the GameState instance. Keep that instance for a match; serializing and reconstructing GameState mid-match does not preserve those runtime cooldowns. Create a new instance for restart. Online multiplayer, authoritative server simulation and save/resume of in-progress matches are outside this version.
