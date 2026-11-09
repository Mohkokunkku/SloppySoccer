import { describe, expect, it } from 'vitest';
import { planTeamMovement } from './tactics.js';
import { createGame, startGame, stepGame } from './engine';
import { EMPTY_INPUT, FIELD, type GameState, type InputState } from './types';

const frame = 1 / 60;
const input = (changes: Partial<InputState> = {}): InputState => ({ ...EMPTY_INPUT, ...changes });
const play = () => { const state = createGame(); startGame(state); return state; };
const advance = (state: GameState, seconds: number, controls = input()) => {
  for (let i = 0; i < Math.round(seconds / frame); i++) stepGame(state, controls, frame);
};
const isolate = (state: GameState) => {
  state.players.forEach((p, i) => { p.x = -10 + i * 2; p.y = 8; p.vx = p.vy = 0; });
  state.ball.ownerId = null;
};

describe('crowded goalkeeper possession', () => {
  function crowdedKeeper(team: 'home' | 'away') {
    const state = play(); isolate(state);
    const sign = team === 'home' ? 1 : -1;
    const keeper = state.players.find(p => p.team === team && p.role === 'keeper')!;
    const attacker = state.players.find(p => p.team !== team && p.role === 'outfield' && p.id !== state.controlledId)!;
    keeper.x = -sign * 14.6; keeper.y = 0;
    attacker.x = keeper.x + sign * 1.15; attacker.y = 0;
    Object.assign(state.ball, { ownerId: keeper.id, x: keeper.x + sign * 0.9, y: 0, vx: 0, vy: 0, z: 0, vz: 0 });
    return { state, keeper, attacker, sign };
  }
  it.each(['home', 'away'] as const)('protects a ball held by the %s keeper from a nearby attacker', team => {
    const { state, keeper } = crowdedKeeper(team);
    // AI waits until elapsed 0.3 before acting: exercise possession before a kick.
    stepGame(state, input(), frame);
    expect(state.ball.ownerId).toBe(keeper.id);
  });
  it.each((['home', 'away'] as const).flatMap(team => (['easy', 'normal', 'hard'] as const).map(difficulty => ({ team, difficulty }))))('escapes repeated $team keeper pressure on $difficulty within a second', ({ team, difficulty }) => {
    const { state, keeper, attacker, sign } = crowdedKeeper(team); state.elapsed = 10;
    // First clearance starts the keeper's normal action cooldown. Immediately
    // catching again must not let crowding reset that cooldown indefinitely.
    stepGame(state, input(), frame, { difficulty });
    expect(state.ball.ownerId).toBeNull();
    Object.assign(state.ball, { ownerId: keeper.id, z: 0, vz: 0 });
    const secondAttacker = state.players.find(p => p.team !== team && p.role === 'outfield' && p.id !== attacker.id && p.id !== state.controlledId)!;
    secondAttacker.x = keeper.x + sign * 1.3; secondAttacker.y = 0.3;
    let releaseAfter = Infinity;
    let progress = 0;
    for (let i = 0; i < 90; i++) {
      stepGame(state, input(), frame, { difficulty });
      if (state.ball.ownerId !== keeper.id && releaseAfter === Infinity) {
        releaseAfter = (i + 1) * frame;
        expect(state.ball.ownerId).toBeNull();
        expect(state.ball.z).toBeGreaterThan(0.65);
      }
      progress = Math.max(progress, (state.ball.x - keeper.x) * sign);
    }
    expect(releaseAfter).toBeLessThan(1);
    // A gentler clearance still travels well beyond the own deep box.
    expect(progress).toBeGreaterThan(8);
    expect(state.phase).toBe('playing');
  });
  it.each(['home', 'away'] as const)('clears over an attacker crowding the %s keeper instead of being recaptured immediately', team => {
    const { state, sign } = crowdedKeeper(team); state.elapsed = 1;
    stepGame(state, input(), frame);
    expect(state.ball.ownerId).toBeNull();
    expect(state.ball.z).toBeGreaterThan(0.65);
    expect(state.ball.vx * sign).toBeGreaterThan(13);
    expect(state.ball.vx * sign).toBeLessThan(14);
    expect(state.ball.vz).toBeGreaterThan(3.5);
    expect(state.ball.vz).toBeLessThan(4);
    expect(state.ball.z).toBeGreaterThan(1.1);
    advance(state, 0.4);
    // Clear the deep box (own x=-10), not the previous near-half-pitch blast.
    expect((state.ball.x + sign * 14.6) * sign).toBeGreaterThan(5);
    expect(state.phase).toBe('playing');
  });
});

describe('goalkeepers', () => {
  it.each(['home', 'away'] as const)('tracks the ball across the %s goal mouth without leaving its box', team => {
    const state = play(); isolate(state); const keeper = state.players.find(p => p.team === team && p.role === 'keeper')!;
    keeper.x = team === 'home' ? -14.6 : 14.6; keeper.y = 0;
    Object.assign(state.ball, { x: team === 'home' ? -11 : 11, y: 2.5, vx: 0, vy: 0 });
    advance(state, 0.25);
    expect(keeper.y).toBeGreaterThan(0.5);
    expect(Math.abs(keeper.y)).toBeLessThan(3);
    expect(Math.abs(keeper.x)).toBeGreaterThan(13);
  });
});

describe('computer figures', () => {
  it.each(['home', 'away'] as const)('lets an uncontrolled %s attacker shoot toward the opposing goal', team => {
    const state = play(); isolate(state); state.elapsed = 1;
    const attacker = state.players.find(p => p.team === team && p.role === 'outfield' && p.id !== state.controlledId)!;
    attacker.x = team === 'home' ? 7 : -7; attacker.y = 0;
    state.ball.ownerId = attacker.id;
    stepGame(state, input(), frame);
    expect(state.ball.ownerId).toBeNull();
    expect(state.ball.vx * (team === 'home' ? 1 : -1)).toBeGreaterThan(15);
  });
  it('moves teammates into support and sends an opponent toward the possessed ball', () => {
    const state = play();
    const supporter = state.players[1]!, pursuer = state.players.find(p=>p.id==='away-0')!;
    const sx = supporter.x;
    const distance = Math.hypot(pursuer.x - state.ball.x, pursuer.y - state.ball.y);
    advance(state, 0.2);
    expect(supporter.x).toBeGreaterThan(sx);
    expect(Math.hypot(pursuer.x - state.ball.x, pursuer.y - state.ball.y)).toBeLessThan(distance);
    expect(state.ball.ownerId).toBe(state.controlledId);
  });
});

describe('goals and boards', () => {
  it.each([-1, 1])('freezes figures, ball, input and clock for five full seconds after a %s goal', sign => {
    const state = play(); isolate(state);
    Object.assign(state.ball, { x: sign * 16.4, y: 0, vx: sign * 10, vy: 0 });
    stepGame(state, input(), frame);
    expect(state.phase).toBe('goal'); expect(state.phaseTimer).toBe(5);
    const frozen = structuredClone(state);
    const held = input({ moveX: 1, shoot: true, pass: true, switchPlayer: true });
    advance(state, 4.9, held);
    expect(state.phase).toBe('goal'); expect(state.phaseTimer).toBeCloseTo(0.1);
    expect(state.players).toEqual(frozen.players); expect(state.ball).toEqual(frozen.ball);
    expect(state.timeRemaining).toBe(frozen.timeRemaining); expect(state.elapsed).toBe(frozen.elapsed);
    expect(state.score).toEqual(frozen.score); expect(state.controlledId).toBe(frozen.controlledId);
    advance(state, 0.1, held);
    expect(state.phase).toBe('resetting');
    expect(state.players).toEqual(frozen.players);
    expect(state.ball).toEqual({x:0,y:0,vx:0,vy:0,z:0,vz:0,ownerId:null});
  });
  it.each([-1, 1])('walks every figure to the actual conceding-team kickoff after a %s goal', sign => {
    const state = play(); isolate(state);
    // Longest legal pitch diagonals exercise a finite, bounded return.
    for (const p of state.players) { p.x = p.team === 'home' ? 15 : -15; p.y = -9; }
    Object.assign(state.ball, {x:sign*16.4,y:0,vx:sign*10,vy:0});
    stepGame(state, input(), frame); advance(state, 5);
    const team = sign === 1 ? 'away' : 'home';
    const targets = state.players.map(p => {
      const slot = Number(p.id.split('-')[1]), dir = p.team === 'home' ? 1 : -1;
      return {x:(slot===3?-14.6:slot===0?(p.team===team?-1:-3):slot===1?-5:-10)*dir,
        y:slot===2?-4.5:slot===4?4.5:0};
    });
    const initial = state.players.map(p => ({x:p.x,y:p.y}));
    const time = state.timeRemaining, elapsed = state.elapsed, score = {...state.score};
    const held = input({shoot:true,pass:true,switchPlayer:true,moveX:1,sprint:true});
    let frames = 0;
    while (state.phase === 'resetting' && frames < 360) {
      const before = state.players.map(p => ({x:p.x,y:p.y}));
      stepGame(state, held, frame); frames++;
      for (const [i,p] of state.players.entries()) {
        expect(Math.hypot(p.x-before[i]!.x,p.y-before[i]!.y)).toBeLessThanOrEqual(7*frame+1e-9);
        const t = targets[i]!;
        expect(Math.hypot(p.x-t.x,p.y-t.y)).toBeLessThanOrEqual(Math.hypot(before[i]!.x-t.x,before[i]!.y-t.y)+1e-9);
      }
      expect(state.timeRemaining).toBe(time); expect(state.elapsed).toBe(elapsed); expect(state.score).toEqual(score);
      if (state.phase === 'resetting') expect(state.ball).toEqual({x:0,y:0,vx:0,vy:0,z:0,vz:0,ownerId:null});
      if (frames === 30) {
        expect(state.phase).toBe('resetting');
        expect(state.players[0]!.x).toBeLessThan(initial[0]!.x);
        expect(state.players[0]!.x).toBeGreaterThan(targets[0]!.x);
      }
    }
    expect(state.phase).toBe('playing'); expect(frames).toBeLessThan(360);
    expect(state.ball.ownerId).toBe(`${team}-0`); expect(state.controlledId).toBe('home-0');
    state.players.forEach((p,i) => { expect(p.x).toBeCloseTo(targets[i]!.x); expect(p.y).toBeCloseTo(targets[i]!.y); });
    // Held actions must not become fresh edges at the transition.
    stepGame(state, {...held,moveX:0}, frame);
    expect(state.controlledId).toBe('home-0'); expect(state.ball.ownerId).toBe(`${team}-0`);
    expect(state.timeRemaining).toBeLessThan(time);
  });
  it('repeats scoring trajectories and resumes each kickoff without counting reset time', () => {
    const state = play();
    for (const [index, sign] of [1,-1,1].entries()) {
      isolate(state);
      Object.assign(state.ball, {x:sign*15.4,y:0,vx:sign*20,vy:0,z:0,vz:0});
      stepGame(state, input(), frame); expect(state.phase).toBe('playing');
      for (let i=0; i<5 && state.phase==='playing'; i++) stepGame(state,input(),frame);
      expect(state.phase).toBe('goal'); expect(state.phaseTimer).toBe(5);
      expect(state.score.home+state.score.away).toBe(index+1);
      const time=state.timeRemaining, elapsed=state.elapsed;
      advance(state,5); expect(state.phase).toBe('resetting');
      for(let i=0;i<360 && state.phase==='resetting';i++) stepGame(state,input(),frame);
      expect(state.phase).toBe('playing'); expect(state.ball.ownerId).toBe(sign===1?'away-0':'home-0');
      expect(state.timeRemaining).toBe(time); expect(state.elapsed).toBe(elapsed);
    }
    expect(state.score).toEqual({home:2,away:1});
  });
  it('finishes a last-tick goal normally instead of starting a frozen reset', () => {
    const state=play(); isolate(state); state.timeRemaining=frame;
    Object.assign(state.ball,{x:16.2,y:0,vx:20,vy:0});
    stepGame(state,input(),frame);
    expect(state.score.home).toBe(1); expect(state.phase).toBe('finished');
    expect(state.timeRemaining).toBe(0);
    const final=structuredClone(state); advance(state,12,input({shoot:true,moveX:1}));
    expect(state).toEqual(final);
  });
  it('rebounds end boards outside the mouth, posts and side walls without scoring', () => {
    for (const sign of [-1, 1]) {
      const state = play(); isolate(state);
      Object.assign(state.ball, { x: sign * 15.7, y: 4, vx: sign * 20, vy: 0 });
      stepGame(state, input(), frame);
      expect(state.ball.vx * sign).toBeLessThan(0);
      expect(Math.abs(state.ball.x)).toBeLessThanOrEqual(16 - FIELD.ballRadius);
      expect(state.score).toEqual({ home: 0, away: 0 });
      Object.assign(state.ball, { x: 0, y: sign * 9.7, vx: 0, vy: sign * 20 });
      stepGame(state, input(), frame);
      expect(state.ball.vy * sign).toBeLessThan(0);
    }
    const post = play(); isolate(post);
    Object.assign(post.ball, { x: 15.7, y: 3.4, vx: 20, vy: 0 });
    stepGame(post, input(), frame);
    expect(post.ball.vx).toBeLessThan(0);
  });
  it.each([1, -1])('scores only after the whole ball crosses the %s goal line', sign => {
    const state = play(); isolate(state);
    Object.assign(state.ball, { x: sign * 15.9, y: 0, vx: sign * 20, vy: 0 });
    stepGame(state, input(), frame);
    expect(state.phase).toBe('playing');
    stepGame(state, input(), frame);
    const team = sign === 1 ? 'home' : 'away';
    expect(state.score[team]).toBe(1);
    expect(state.lastScorer).toBe(team);
    expect(state.phase).toBe('goal');
    expect(state.phaseTimer).toBeGreaterThan(0);
    expect(state.ball.ownerId).toBeNull();
    stepGame(state, input(), frame);
    expect(state.score[team]).toBe(1);
  });
});

describe('free ball physics', () => {
  it('slows on the pitch and bounces a small arc back to rest', () => {
    const state = play(); isolate(state);
    Object.assign(state.ball, { x: 0, y: 0, vx: 4, vy: 0, z: 0.1, vz: -2 });
    stepGame(state, input(), 0.1);
    expect(state.ball.vx).toBeLessThan(4);
    expect(state.ball.vx).toBeGreaterThan(0);
    expect(state.ball.z).toBe(0);
    expect(state.ball.vz).toBeGreaterThan(0);
    advance(state, 1);
    expect(state.ball.z).toBeGreaterThanOrEqual(0);
    expect(state.ball.z).toBeLessThan(0.01);
  });
});

describe('ball actions', () => {
  it('allows a nearby opponent to win possession with a brief protection against ping-pong tackles', () => {
    const state = play(); isolate(state); state.elapsed = 1;
    const home = state.players[0]!, away = state.players.find(p=>p.id==='away-0')!;
    home.x = 0; home.y = 0; home.facing = 0;
    away.x = 0.8; away.y = 0;
    Object.assign(state.ball, { ownerId: home.id, x: 0.9, y: 0 });
    stepGame(state, input(), frame);
    expect(state.ball.ownerId).toBe(away.id);
    home.x = away.x; home.y = away.y;
    stepGame(state, input(), frame);
    expect(state.ball.ownerId).toBe(away.id);
  });
  it('collects a nearby low ball but cannot immediately recapture its own kick', () => {
    const state = play(); isolate(state);
    const p = state.players[0]!; p.x = 0; p.y = 0;
    Object.assign(state.ball, { x: 0.7, y: 0, vx: 0, vy: 0 });
    stepGame(state, input(), frame);
    expect(state.ball.ownerId).toBe(p.id);
    stepGame(state, input({ shoot: true }), frame);
    expect(state.ball.ownerId).toBeNull();
    expect(state.ball.vx).toBeGreaterThan(15);
    const high = play(); isolate(high);
    high.players[0]!.x = 0; high.players[0]!.y = 0;
    Object.assign(high.ball, { x: 0, y: 0, z: 2 });
    stepGame(high, input(), frame);
    expect(high.ball.ownerId).toBeNull();
  });
  it('switches to the closest other home outfielder on an edge, never a keeper or opponent', () => {
    const state = play();
    const previous = state.controlledId;
    state.ball.ownerId = null; state.ball.x = -6; state.ball.y = 0;
    stepGame(state, input({ switchPlayer: true }), frame);
    expect(state.controlledId).toBe('home-1');
    stepGame(state, input({ switchPlayer: true }), frame);
    expect(state.controlledId).toBe('home-1');
    stepGame(state, input(), frame);
    stepGame(state, input({ switchPlayer: true }), frame);
    expect(state.controlledId).not.toBe('home-1');
    expect(state.players.find(p => p.id === previous)?.team).toBe('home');
  });
  it('passes toward an indicated teammate and switches control to the receiver only once per press', () => {
    const state = play();
    const passer = state.players[0]!, receiver = state.players[1]!;
    receiver.x = 3; receiver.y = -4;
    stepGame(state, input({ pass: true, moveX: 1, moveY: -1 }), frame);
    expect(state.ball.ownerId).toBeNull();
    expect(state.ball.vx).toBeGreaterThan(0);
    expect(state.ball.vy).toBeLessThan(0);
    expect(state.controlledId).toBe(receiver.id);
    expect(state.controlledId).not.toBe(passer.id);
    state.ball.ownerId = receiver.id;
    stepGame(state, input({ pass: true }), frame);
    expect(state.ball.ownerId).toBe(receiver.id);
  });
  it('requires a fresh press for another shot, including after a failed possession attempt', () => {
    const state = play();
    stepGame(state, input({ shoot: true }), frame);
    state.ball.ownerId = state.controlledId;
    stepGame(state, input({ shoot: true }), frame);
    expect(state.ball.ownerId).toBe(state.controlledId);
    stepGame(state, input(), frame);
    stepGame(state, input({ shoot: true }), frame);
    expect(state.ball.ownerId).toBeNull();
  });
  it('shoots along input with a small arc and assists a forward shot toward goal', () => {
    const state = play();
    stepGame(state, input({ shoot: true }), frame);
    expect(state.ball.ownerId).toBeNull();
    expect(state.ball.vx).toBeGreaterThan(15);
    expect(state.ball.z).toBeGreaterThan(0);
    const side = play();
    stepGame(side, input({ moveY: 1, shoot: true }), frame);
    expect(side.ball.vy).toBeGreaterThan(15);
    expect(Math.abs(side.ball.vx)).toBeLessThan(1);
    const assisted = play();
    assisted.players[0]!.x = 7; assisted.players[0]!.y = 4;
    stepGame(assisted, input({ moveX: 1, shoot: true }), frame);
    expect(assisted.ball.vx).toBeGreaterThan(0);
    expect(assisted.ball.vy).toBeLessThan(-1);
  });
});

describe('movement', () => {
  it('sprints faster while draining stamina, then recovers without sprint', () => {
    const running = play(), walking = play();
    const a = running.players[0]!, b = walking.players[0]!;
    advance(running, 0.5, input({ moveX: 1, sprint: true }));
    advance(walking, 0.5, input({ moveX: 1 }));
    expect(a.x).toBeGreaterThan(b.x);
    expect(a.stamina).toBeLessThan(1);
    const depleted = a.stamina;
    advance(running, 0.5);
    expect(a.stamina).toBeGreaterThan(depleted);
    expect(a.stamina).toBeLessThanOrEqual(1);
  });
  it('moves responsively with a capped diagonal and carries the possessed ball', () => {
    const straight = play(), diagonal = play();
    const a = straight.players.find(p => p.id === straight.controlledId)!;
    const b = diagonal.players.find(p => p.id === diagonal.controlledId)!;
    const x = a.x, y = a.y;
    stepGame(straight, input({ moveX: 1 }), frame);
    stepGame(diagonal, input({ moveX: 1, moveY: 1 }), frame);
    expect(a.x).toBeGreaterThan(x);
    expect(Math.hypot(b.x - x, b.y - y)).toBeCloseTo(a.x - x);
    expect(b.facing).toBeGreaterThan(0);
    expect(b.facing).toBeLessThan(Math.PI / 4);
    expect(b.facing).toBeLessThanOrEqual(7 * frame + 1e-9);
    expect(diagonal.ball.x).toBeGreaterThan(b.x);
    expect(Math.hypot(diagonal.ball.x - b.x, diagonal.ball.y - b.y)).toBeLessThan(1.2);
    a.x = FIELD.width / 2 - FIELD.playerRadius;
    advance(straight, 1, input({ moveX: 1 }));
    expect(a.x).toBeLessThanOrEqual(FIELD.width / 2 - FIELD.playerRadius);
  });
});

describe('match lifecycle', () => {
  it('stays completely frozen while ready, starts explicitly and counts down to a frozen finish', () => {
    const state = createGame({ duration: 0.05 });
    const before = structuredClone(state);
    stepGame(state, input({ moveX: 1, shoot: true }), frame);
    expect(state).toEqual(before);
    startGame(state);
    expect(state.phase).toBe('playing');
    stepGame(state, input(), frame);
    expect(state.timeRemaining).toBeCloseTo(0.05 - frame);
    advance(state, 0.1);
    expect(state.phase).toBe('finished');
    expect(state.timeRemaining).toBe(0);
    const finished = structuredClone(state);
    startGame(state);
    stepGame(state, input({ moveX: 1 }), 0.1);
    expect(state).toEqual(finished);
  });
});

describe('safety and keeper saves', () => {
  it.each(['home', 'away'] as const)('lets the %s keeper stop a low shot and clear it forward', team => {
    const state = play(); isolate(state); state.elapsed = 1;
    const keeper = state.players.find(p => p.team === team && p.role === 'keeper')!;
    const sign = team === 'home' ? 1 : -1;
    keeper.x = -sign * 14.6; keeper.y = 0;
    Object.assign(state.ball, { x: keeper.x + sign * 0.5, y: 0, vx: -sign * 12, vy: 0, z: 0.2 });
    stepGame(state, input(), frame);
    expect(state.ball.ownerId).toBe(keeper.id);
    expect(state.score).toEqual({ home: 0, away: 0 });
    stepGame(state, input(), frame);
    expect(state.ball.ownerId).toBeNull();
    expect(state.ball.vx * sign).toBeGreaterThan(13);
    expect(state.ball.vx * sign).toBeLessThan(14);
  });
  it('ignores invalid timestep and clamps huge input and timestep without NaN', () => {
    const state = play(); const before = structuredClone(state);
    for (const dt of [NaN, Infinity, -1, 0]) stepGame(state, input({ moveX: 1 }), dt);
    expect(state).toEqual(before);
    stepGame(state, input({ moveX: Infinity, moveY: NaN }), 1000);
    expect(state.elapsed).toBeCloseTo(0.1);
    expect(state.players.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });
  it('replays the same inputs deterministically', () => {
    const a = play(), b = play();
    for (let i = 0; i < 1200; i++) {
      const controls = input({ moveX: i % 240 < 120 ? 1 : -1, moveY: Math.sin(i / 100), shoot: i % 80 === 0, pass: i % 97 === 0, sprint: i % 140 < 70 });
      stepGame(a, controls, frame); stepGame(b, controls, frame);
    }
    expect(a).toEqual(b);
  });
});

describe('role-aware AI movement', () => {
  it.each(['home','away'] as const)('makes the nearest %s defender retreat beneath a midfield presser in real play', team => {
    const state=play(); const sign=team==='home'?1:-1, enemy=team==='home'?'away':'home';
    state.controlledId=`${enemy}-0`;
    const defender=state.players.find(p=>p.id===`${team}-2`)!;
    const middle=state.players.find(p=>p.id===`${team}-1`)!;
    Object.assign(state.players.find(p=>p.id===`${team}-0`)!,{x:9*sign,y:6});
    Object.assign(middle,{x:6*sign,y:-5}); Object.assign(defender,{x:-6*sign,y:0});
    Object.assign(state.players.find(p=>p.id===state.controlledId)!,{x:-6*sign,y:0,facing:sign===1?Math.PI:0});
    state.ball.ownerId=state.controlledId;
    advance(state,0.5);
    expect(defender.x*sign).toBeLessThan(-7.5);
    expect(defender.x*sign).toBeLessThan(middle.x*sign-3);
  });
  it.each(['home','away'] as const)('keeps %s deep defense visible below the midfield with a forward carrier', team => {
    const state=play(); const sign=team==='home'?1:-1;
    state.controlledId=`${team}-0`; state.ball.ownerId=state.controlledId;
    const attacker=state.players.find(p=>p.id===state.controlledId)!; attacker.x=12*sign;
    for(const p of state.players.filter(p=>p.team!==team)){p.x=14*sign;p.y=9;}
    const defender=state.players.find(p=>p.id===`${team}-2`)!;
    const middle=state.players.find(p=>p.id===`${team}-1`)!;
    advance(state,2);
    expect(defender.x*sign).toBeLessThan(-7.4);
    expect(middle.x*sign-defender.x*sign).toBeGreaterThan(5);
    expect(attacker.x).toBe(12*sign);
  });
  it('keeps the defender underneath the midfield support while the team attacks', () => {
    const state=play(); state.players[0]!.x=5;
    for(const p of state.players.filter(p=>p.team==='away')) {p.x=14;p.y=9;}
    advance(state,2);
    expect(state.ball.ownerId).toBe(state.controlledId);
    expect(state.players[2]!.x).toBeLessThan(-3.5);
    expect(state.players[1]!.x).toBeGreaterThan(state.players[2]!.x+2);
  });
  it('hands control over immediately without AI moving the selected defender', () => {
    const state=play(); stepGame(state,input(),frame);
    state.controlledId='home-2';
    const defender=state.players[2]!;
    const before={vx:defender.vx,vy:defender.vy};
    const isolated=structuredClone(state);isolated.players=[isolated.players[2]!];
    stepGame(state,input({moveY:1}),frame);
    stepGame(isolated,input({moveY:1}),frame);
    // Existing inertia eases toward user input; no AI velocity is added after selection.
    expect(defender.vx).toBeCloseTo(isolated.players[0]!.vx);
    expect(defender.vy).toBeCloseTo(isolated.players[0]!.vy);
    expect(defender.vy).toBeGreaterThan(before.vy);
    expect(Math.hypot(defender.vx-before.vx,defender.vy-before.vy)).toBeLessThanOrEqual(24*frame+1e-9);
    expect(state.players[0]!.vx).toBeGreaterThan(0);
    expect(state.players[2]!.tacticalRole).toBe('defender');
  });
  it('does not retarget support every animation frame when the carrier moves', () => {
    const state = play();
    for (const p of state.players.filter(p => p.team === 'away')) { p.x=14; p.y=9; }
    const target = planTeamMovement(state,'home').find(p => p.playerId==='home-1')!;
    stepGame(state,input(),frame);
    state.players[0]!.x = 4;
    const middle=state.players[1]!; const before={x:middle.x,y:middle.y};
    stepGame(state,input(),frame);
    expect(Math.atan2(middle.vy,middle.vx)).toBeCloseTo(Math.atan2(target.y-before.y,target.x-before.x));
  });
  it('stops settled supporting figures instead of making the whole team chase the ball', () => {
    const state = play();
    for (const p of state.players.filter(p => p.team === 'away')) { p.x = 14; p.y = 9; }
    const targets = planTeamMovement(state, 'home');
    for (const target of targets) Object.assign(state.players.find(p => p.id === target.playerId)!, {x:target.x,y:target.y});
    stepGame(state, input(), frame);
    for (const target of targets) {
      const p = state.players.find(p => p.id === target.playerId)!;
      expect(p.vx).toBe(0); expect(p.vy).toBe(0);
    }
  });
});

describe('tactical role identity', () => {
  it.each(['home', 'away'] as const)('starts %s with visibly distinct attacker, midfield and deep defense', team => {
    const state = createGame(); const sign = team === 'home' ? 1 : -1;
    const [attacker, middle, defender] = state.players.filter(p => p.team === team);
    expect(defender!.x * sign).toBe(-10);
    expect(middle!.x * sign).toBe(-5);
    expect(attacker!.x * sign).toBeGreaterThan(middle!.x * sign);
  });
  it.each(['home', 'away'] as const)('assigns one attacker, midfielder and defender to %s without changing keeper identity', team => {
    const state = createGame();
    expect(state.players.filter(p => p.team === team && p.role === 'outfield').map(p => p.tacticalRole))
      .toEqual(['attacker', 'midfielder', 'defender', 'defender']);
    expect(state.players.find(p => p.team === team && p.role === 'keeper')?.tacticalRole).toBeUndefined();
  });
});

describe('match creation', () => {
  it.each([NaN, Infinity, -10, 0, 601])('falls back from invalid duration %s to a finite playable match', duration => {
    const state = createGame({ duration });
    expect(state.timeRemaining).toBe(120);
  });
  it('creates ten figures with four outfield players and one keeper per team', () => {
    const state = createGame({ duration: 75 });
    expect(state.players).toHaveLength(10);
    for (const team of ['home', 'away']) {
      expect(state.players.filter(p => p.team === team && p.role === 'outfield')).toHaveLength(4);
      expect(state.players.filter(p => p.team === team && p.role === 'keeper')).toHaveLength(1);
    }
    expect(new Set(state.players.map(p => p.id)).size).toBe(10);
    expect(state.phase).toBe('ready');
    expect(state.timeRemaining).toBe(75);
    const controlled = state.players.find(p => p.id === state.controlledId)!;
    expect(controlled.team).toBe('home');
    expect(controlled.role).toBe('outfield');
    expect(state.ball.ownerId).toBe(controlled.id);
    expect(Math.hypot(state.ball.x - controlled.x, state.ball.y - controlled.y)).toBeLessThan(1.5);
  });
});
