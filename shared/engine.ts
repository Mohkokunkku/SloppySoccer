import { planTeamMovement, type TacticalIntent } from './tactics.js';
import { DEFAULT_TUNING, getTuning } from './tuning.js';
import type { GameTuning } from './types.js';
import { DEFAULT_CONFIG, FIELD, type GameState, type InputState, type MatchConfig, type Player, type Team } from './types.js';

const direction = (team: Team) => team === 'home' ? 1 : -1;
interface Runtime {
  shoot: boolean; pass: boolean; switchPlayer: boolean;
  pickupLock: number; kickerId: string | null;
  aiCooldowns: Map<string, number>;
  tacticalPlans: Map<Team, {context:string;nextAt:number;intents:TacticalIntent[]}>;
}
const runtimes = new WeakMap<GameState, Runtime>();
function runtime(state: GameState): Runtime {
  let value = runtimes.get(state);
  if (!value) {
    value = { shoot: false, pass: false, switchPlayer: false, pickupLock: 0, kickerId: null, aiCooldowns: new Map(), tacticalPlans: new Map() };
    runtimes.set(state, value);
  }
  return value;
}

export function kickoffPosition(team: Team, slot: number, receivingTeam: Team, tuning: GameTuning = DEFAULT_TUNING): {x:number;y:number} {
  return {
    x: (slot === 3 ? -14.6 : slot === 0 ? (team === receivingTeam ? -1 : -3) : slot === 1 ? -5 : -10) * direction(team) * tuning.fieldWidth / 32,
    y: (slot === 1 ? -5 : slot === 2 ? 5 : 0) * tuning.fieldHeight / 20,
  };
}

export function createGame(config: Partial<MatchConfig> = {}): GameState {
  const players: Player[] = [];
  for (const team of ['home', 'away'] as const) {
    const sign = direction(team);
    for (let i = 0; i < 4; i++) players.push({
      id: `${team}-${i}`, team, role: i === 3 ? 'keeper' : 'outfield',
      ...(i < 3 ? { tacticalRole: (['attacker', 'midfielder', 'defender'] as const)[i] } : {}),
      ...kickoffPosition(team, i, 'home'),
      vx: 0, vy: 0, facing: sign === 1 ? 0 : Math.PI, stamina: 1,
    });
  }
  return { players, ball: { x: -0.1, y: 0, vx: 0, vy: 0, z: 0, vz: 0, ownerId: 'home-0' },
    score: { home: 0, away: 0 }, timeRemaining: typeof config.duration === 'number' && Number.isFinite(config.duration) && config.duration > 0 && config.duration <= 600 ? config.duration : DEFAULT_CONFIG.duration,
    phase: 'ready', phaseTimer: 0, controlledId: 'home-0', lastScorer: null, elapsed: 0 };
}

export function startGame(state: GameState, withEntrance = false): void {
  if (state.phase !== 'ready') return;
  state.phase = withEntrance ? 'entering' : 'playing';
  if (withEntrance) {
    const fieldHeight=getTuning(state).fieldHeight;
    state.entrance={fieldHeight,exitY:fieldHeight/2+.5,completed:[]};
    for (const p of state.players) {
      p.x = p.team === 'home' ? -2 : 2;
      p.y = fieldHeight / 2 + 2 + Number(p.id.split('-')[1]) * .6;
      p.vx = p.vy = 0;
    }
    Object.assign(state.ball,{x:0,y:0,vx:0,vy:0,z:0,vz:0,ownerId:null});
  }
}
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
const axis = (n: number) => Number.isFinite(n) ? clamp(n, -1, 1) : 0;
function turn(player: Player, target: number, dt: number, tuning: GameTuning): void {
  const delta = Math.atan2(Math.sin(target-player.facing),Math.cos(target-player.facing));
  player.facing += clamp(delta,-tuning.turnRate*dt,tuning.turnRate*dt);
}
function move(player: Player, x: number, y: number, speed: number, dt: number, tuning: GameTuning, facing?: number): void {
  const length = Math.max(1, Math.hypot(x, y));
  const dx=x/length*speed-player.vx, dy=y/length*speed-player.vy;
  const blend=Math.min(1,tuning.acceleration*dt/(Math.hypot(dx,dy)||1));
  player.vx += dx*blend; player.vy += dy*blend;
  if (facing !== undefined || x || y) turn(player,facing ?? Math.atan2(y,x),dt,tuning);
  const nx=player.x+player.vx*dt, ny=player.y+player.vy*dt;
  player.x = clamp(nx, -tuning.fieldWidth / 2 + FIELD.playerRadius, tuning.fieldWidth / 2 - FIELD.playerRadius);
  player.y = clamp(ny, -tuning.fieldHeight / 2 + FIELD.playerRadius, tuning.fieldHeight / 2 - FIELD.playerRadius);
  if(player.x!==nx)player.vx=0;
  if(player.y!==ny)player.vy=0;
}
function dribble(state: GameState): void {
  const owner = state.players.find(p => p.id === state.ball.ownerId);
  if (!owner) return;
  const tuning=getTuning(state);
  state.ball.x = clamp(owner.x + Math.cos(owner.facing) * 0.9, -tuning.fieldWidth/2, tuning.fieldWidth/2);
  state.ball.y = clamp(owner.y + Math.sin(owner.facing) * 0.9, -tuning.fieldHeight/2+FIELD.ballRadius, tuning.fieldHeight/2-FIELD.ballRadius);
  state.ball.vx = owner.vx; state.ball.vy = owner.vy;
  state.ball.z = state.ball.vz = 0;
}
function shoot(state: GameState, player: Player, x: number, y: number): void {
  let dx = x || y ? x : Math.cos(player.facing);
  let dy = x || y ? y : Math.sin(player.facing);
  const length = Math.hypot(dx, dy) || 1;
  dx /= length; dy /= length;
  const sign = direction(player.team);
  const gx = sign * getTuning(state).fieldWidth/2 - player.x, gy = -player.y;
  const goalDistance = Math.hypot(gx, gy);
  if (dx * sign > 0.5 && goalDistance < 24 && (dx * gx + dy * gy) / goalDistance > 0.65) {
    dx = dx * 0.4 + gx / goalDistance * 0.6;
    dy = dy * 0.4 + gy / goalDistance * 0.6;
  }
  const aimLength = Math.hypot(dx, dy);
  state.ball.ownerId = null;
  state.ball.release={id:(state.ball.release?.id??0)+1,type:player.role==='keeper'?'clearance':'shot',playerId:player.id};
  state.ball.vx = dx / aimLength * getTuning(state).kickPower;
  state.ball.vy = dy / aimLength * getTuning(state).kickPower;
  state.ball.vz = 3.2;
  runtime(state).pickupLock = 0.24;
  runtime(state).kickerId = player.id;
}
function pass(state: GameState, player: Player, x: number, y: number): void {
  const length = Math.hypot(x, y);
  const dx = length ? x / length : Math.cos(player.facing);
  const dy = length ? y / length : Math.sin(player.facing);
  const candidates = state.players.filter(p => p.team === player.team && p.role === 'outfield' && p.id !== player.id);
  const rating = (p: Player) => {
    const distance = Math.hypot(p.x - player.x, p.y - player.y) || 1;
    return ((p.x - player.x) * dx + (p.y - player.y) * dy) / distance * 8 - distance * 0.25;
  };
  candidates.sort((a, b) => rating(b) - rating(a));
  const target = candidates[0];
  if (!target) return;
  const tx = target.x - state.ball.x, ty = target.y - state.ball.y;
  const distance = Math.hypot(tx, ty) || 1;
  state.ball.ownerId = null;
  state.ball.release={id:(state.ball.release?.id??0)+1,type:'pass',playerId:player.id};
  state.ball.vx = tx / distance * getTuning(state).passPower;
  state.ball.vy = ty / distance * getTuning(state).passPower;
  state.ball.vz = 0.8;
  runtime(state).pickupLock = 0.24;
  runtime(state).kickerId = player.id;
  if (player.id === state.controlledId) state.controlledId = target.id;
}
function kickoff(state: GameState, team: Team): void {
  for (const p of state.players) {
    const sign = direction(p.team);
    // Positioning has already completed through bounded resetting movement.
    p.vx = p.vy = 0; p.facing = sign === 1 ? 0 : Math.PI;
    p.stamina = Math.max(p.stamina, 0.65);
  }
  state.controlledId = 'home-0';
  state.ball.ownerId = `${team}-0`;
  dribble(state);
  state.phase = 'playing'; state.phaseTimer = 0;
  delete state.entrance;
  const meta = runtime(state);
  meta.pickupLock = 0; meta.kickerId = null; meta.aiCooldowns.clear(); meta.tacticalPlans.clear();
}
function updateOutfieldAI(state: GameState, dt: number, config: Partial<MatchConfig>): void {
  // Plan both sides before moving either side; keep user control authoritative.
  const meta = runtime(state);
  const context = `${state.ball.ownerId}:${state.controlledId}:${JSON.stringify(getTuning(state))}`;
  const intents: TacticalIntent[] = [];
  for (const team of ['home','away'] as const) {
    let plan = meta.tacticalPlans.get(team);
    if (!plan || plan.context !== context || state.elapsed >= plan.nextAt) {
      plan = {context,nextAt:state.elapsed + 0.2,intents:planTeamMovement(state,team)};
      meta.tacticalPlans.set(team,plan);
    }
    intents.push(...plan.intents);
  }
  for (const intent of intents) {
    const p = state.players.find(player => player.id === intent.playerId);
    if (!p || p.id === state.controlledId || p.role !== 'outfield') continue;
    const dx = intent.x - p.x, dy = intent.y - p.y;
    const speed = (p.team === 'home' ? 4.5 : config.difficulty === 'easy' ? 3.3 : config.difficulty === 'hard' ? 5.3 : 4.2) * getTuning(state).runSpeed/5.6;
    if (Math.hypot(dx,dy) <= intent.arrivalRadius) move(p,0,0,0,dt,getTuning(state));
    else move(p,dx,dy,speed,dt,getTuning(state));
    p.stamina = clamp(p.stamina + dt * 0.15,0,1);
  }
}
function updateKeepers(state: GameState, dt: number, config: Partial<MatchConfig>): void {
  for (const keeper of state.players.filter(p => p.role === 'keeper')) {
    const sign = direction(keeper.team);
    const homeX = -sign * 14.6 * getTuning(state).fieldWidth/32;
    const towardsGoal = state.ball.vx * sign < -0.1;
    const travel = towardsGoal ? Math.max(0, (homeX - state.ball.x) / state.ball.vx) : 0;
    const prediction = state.ball.y + state.ball.vy * Math.min(travel, 0.4);
    const targetY = clamp(prediction, -getTuning(state).goalWidth / 2 + 0.75, getTuning(state).goalWidth / 2 - 0.75);
    const speed = keeper.team === 'away' && config.difficulty === 'easy' ? 3 : config.difficulty === 'hard' ? 5 : 4.2;
    move(keeper, homeX - keeper.x, targetY - keeper.y, speed * getTuning(state).runSpeed/5.6, dt,getTuning(state),sign === 1 ? 0 : Math.PI);
  }
}
function contestPossession(state: GameState): void {
  const owner = state.players.find(p => p.id === state.ball.ownerId);
  const meta = runtime(state);
  // A caught keeper ball is held securely, not dribbled/tackleable possession.
  if (!owner || owner.role === 'keeper' || (meta.kickerId === owner.id && meta.pickupLock > 0)) return;
  const challenger = state.players.filter(p => p.team !== owner.team
    && Math.hypot(p.x - state.ball.x, p.y - state.ball.y) < FIELD.playerRadius + FIELD.ballRadius)
    .sort((a, b) => Math.hypot(a.x - state.ball.x, a.y - state.ball.y) - Math.hypot(b.x - state.ball.x, b.y - state.ball.y))[0];
  if (challenger) {
    state.ball.ownerId = challenger.id;
    meta.kickerId = challenger.id; meta.pickupLock = 0.45;
    meta.aiCooldowns.set(challenger.id, 0.45);
    dribble(state);
  }
}
function updateAIAction(state: GameState, dt: number): void {
  const meta = runtime(state);
  for (const [id, seconds] of meta.aiCooldowns) meta.aiCooldowns.set(id, Math.max(0, seconds - dt));
  const owner = state.players.find(p => p.id === state.ball.ownerId);
  if (!owner || owner.id === state.controlledId || (meta.aiCooldowns.get(owner.id) ?? 0) > 0 || state.elapsed < 0.3) return;
  const sign = direction(owner.team);
  if (owner.role === 'keeper') {
    shoot(state, owner, sign, Math.sin(state.elapsed) * 0.25);
    // Release from the keeper's hands, above the outfield pickup band. A low
    // foot-level clearance can be caught in this same step by a crowding striker.
    state.ball.vx *= getTuning(state).keeperPower / getTuning(state).kickPower;
    state.ball.vy *= getTuning(state).keeperPower / getTuning(state).kickPower;
    state.ball.z = 1.1;
    state.ball.vz = 4;
    meta.aiCooldowns.set(owner.id, 0.8);
  } else if (getTuning(state).fieldWidth/2 - owner.x * sign < 13 * getTuning(state).fieldWidth/32) {
    shoot(state, owner, sign * getTuning(state).fieldWidth/2 - owner.x, Math.sin(state.elapsed * 1.7) * 2 - owner.y);
    meta.aiCooldowns.set(owner.id, 1);
  } else if (state.elapsed > 1 && state.players.some(p => p.team === owner.team && p.role === 'outfield' && p.id !== owner.id && (p.x - owner.x) * sign > 3.5)) {
    pass(state, owner, sign, 0);
    meta.aiCooldowns.set(owner.id, 1.4);
  }
}
export function stepGame(state: GameState, input: InputState, dt: number, config: Partial<MatchConfig> = {}): void {
  if (state.phase === 'ready' || state.phase === 'finished' || !Number.isFinite(dt) || dt <= 0) return;
  if (state.phase === 'goal') {
    const meta = runtime(state);
    meta.shoot = !!input.shoot; meta.pass = !!input.pass; meta.switchPlayer = !!input.switchPlayer;
    state.phaseTimer = Math.max(0, state.phaseTimer - Math.min(dt, 0.1));
    if (state.phaseTimer < 1e-9) {
      state.phase = 'resetting'; state.phaseTimer = 0;
      Object.assign(state.ball, {x:0,y:0,vx:0,vy:0,z:0,vz:0,ownerId:null});
    }
    return;
  }
  if (state.phase === 'resetting' || state.phase === 'entering') {
    const meta = runtime(state);
    meta.shoot = !!input.shoot; meta.pass = !!input.pass; meta.switchPlayer = !!input.switchPlayer;
    const team = state.phase === 'entering' ? 'home' : state.lastScorer === 'home' ? 'away' : 'home';
    const resetDt = Math.min(dt, 0.1);
    const entering=state.phase==='entering';
    const entrance=entering?(state.entrance??={fieldHeight:getTuning(state).fieldHeight,exitY:getTuning(state).fieldHeight/2+.5,completed:[]}):undefined;
    if(entering)state.phaseTimer+=resetDt;
    const routeSpeed=entering?Math.min(7,getTuning(state).acceleration*state.phaseTimer):7;
    let arrived = true;
    Object.assign(state.ball, {x:0,y:0,vx:0,vy:0,z:0,vz:0,ownerId:null});
    for (const p of state.players) {
      const exiting=!!entrance&&!entrance.completed.includes(p.id);
      const target = exiting?{x:p.team==='home'?-2:2,y:entrance!.exitY}:kickoffPosition(p.team, Number(p.id.split('-')[1]), team,getTuning(state));
      const dx = target.x - p.x, dy = target.y - p.y;
      const distance = Math.hypot(dx, dy);
      if (distance > routeSpeed * resetDt) {
        p.vx=dx/distance*routeSpeed;p.vy=dy/distance*routeSpeed;
        p.x+=p.vx*resetDt;p.y+=p.vy*resetDt;
        turn(p,Math.atan2(dy,dx),resetDt,getTuning(state));
        arrived = false;
      } else {
        p.vx = dx / resetDt; p.vy = dy / resetDt;
        if (distance > 0) turn(p,Math.atan2(dy,dx),resetDt,getTuning(state));
        p.x = target.x; p.y = target.y;
        if(exiting){entrance!.completed.push(p.id);arrived=false;}
      }
    }
    if (arrived) kickoff(state, team);
    return;
  }
  dt = Math.min(dt, 0.1, state.timeRemaining);
  const meta = runtime(state);
  meta.pickupLock = Math.max(0, meta.pickupLock - dt);
  const shotPressed = !!input.shoot && !meta.shoot;
  const passPressed = !!input.pass && !meta.pass;
  const switchPressed = !!input.switchPlayer && !meta.switchPlayer;
  meta.shoot = !!input.shoot;
  meta.pass = !!input.pass;
  meta.switchPlayer = !!input.switchPlayer;
  if (switchPressed) {
    const candidates = state.players.filter(p => p.team === 'home' && p.role === 'outfield' && p.id !== state.controlledId);
    candidates.sort((a, b) => Math.hypot(a.x - state.ball.x, a.y - state.ball.y) - Math.hypot(b.x - state.ball.x, b.y - state.ball.y));
    if (candidates[0]) state.controlledId = candidates[0].id;
  }
  const player = state.players.find(p => p.id === state.controlledId);
  if (player) {
    const x = axis(input.moveX), y = axis(input.moveY);
    const sprint = input.sprint && player.stamina > 0.08 && Math.hypot(x, y) > 0;
    move(player, x, y, getTuning(state).runSpeed * (sprint ? getTuning(state).sprintMultiplier : 1), dt,getTuning(state));
    player.stamina = clamp(player.stamina + (sprint ? -0.32 : 0.2) * dt, 0, 1);
  }
  updateOutfieldAI(state, dt, config);
  updateKeepers(state, dt, config);
  dribble(state);
  contestPossession(state);
  updateAIAction(state, dt);
  if (player && state.ball.ownerId === player.id && shotPressed) shoot(state, player, axis(input.moveX), axis(input.moveY));
  else if (player && state.ball.ownerId === player.id && passPressed) pass(state, player, axis(input.moveX), axis(input.moveY));
  if (!state.ball.ownerId) {
    const ball = state.ball;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.z > 0 || ball.vz !== 0) {
      ball.vz -= 11 * dt;
      ball.z += ball.vz * dt;
      if (ball.z <= 0) {
        ball.z = 0;
        ball.vz = Math.abs(ball.vz) > 0.9 ? -ball.vz * 0.3 : 0;
      }
    }
    const friction = Math.exp(-(ball.z > 0 ? 0.35 : 1.45) * dt);
    ball.vx *= friction; ball.vy *= friction;
    if (Math.hypot(ball.vx, ball.vy) < 0.04) ball.vx = ball.vy = 0;
    const side = getTuning(state).fieldHeight / 2 - FIELD.ballRadius;
    if (Math.abs(ball.y) > side) {
      ball.y = Math.sign(ball.y) * side;
      ball.vy = -Math.sign(ball.y) * Math.abs(ball.vy) * 0.78;
    }
    const end = getTuning(state).fieldWidth / 2 - FIELD.ballRadius;
    const mouth = Math.abs(ball.y) <= getTuning(state).goalWidth / 2 - FIELD.ballRadius && ball.z < getTuning(state).goalHeight-FIELD.ballRadius;
    if (Math.abs(ball.x) > end && !mouth) {
      ball.x = Math.sign(ball.x) * end;
      ball.vx = -Math.sign(ball.x) * Math.abs(ball.vx) * 0.78;
    }
    if (ball.z < 0.65) {
      const candidates = state.players.filter(p => !(p.id === meta.kickerId && meta.pickupLock > 0)
        && Math.hypot(p.x - ball.x, p.y - ball.y) < FIELD.playerRadius + FIELD.ballRadius + 0.18);
      candidates.sort((a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y));
      if (candidates[0]) { ball.ownerId = candidates[0].id; dribble(state); }
    }
  }
  if (Math.abs(state.ball.x) > getTuning(state).fieldWidth / 2 + FIELD.ballRadius
    && Math.abs(state.ball.y) <= getTuning(state).goalWidth / 2 - FIELD.ballRadius && state.ball.z < getTuning(state).goalHeight-FIELD.ballRadius) {
    const team: Team = state.ball.x > 0 ? 'home' : 'away';
    state.score[team]++;
    state.lastScorer = team;
    state.phase = 'goal'; state.phaseTimer = 5;
    state.ball.ownerId = null;
    state.ball.vx = state.ball.vy = state.ball.vz = 0;
    for (const p of state.players) p.vx = p.vy = 0;
  }
  state.timeRemaining = Math.max(0, state.timeRemaining - dt);
  state.elapsed += dt;
  if (state.timeRemaining <= 1e-9) { state.timeRemaining = 0; state.phase = 'finished'; }
}
