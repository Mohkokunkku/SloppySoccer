import { describe, expect, it } from 'vitest';
import { createGame } from './engine.js';
import { planTeamMovement, tacticalRoleOf } from './tactics.js';
import { FIELD, type GameState } from './types.js';

const setup = () => {
  const state = createGame();
  state.controlledId = 'none';
  state.phase = 'playing';
  return state;
};
const player = (state: GameState, id: string) => state.players.find(p => p.id === id)!;
const intent = (state: GameState, id: string) => planTeamMovement(state, 'home').find(p => p.playerId === id)!;

describe('planTeamMovement', () => {
  it.each(['home', 'away'] as const)('reserves the nearest %s defender for deep emergencies, not ordinary pressing', team => {
    const state = setup(); const sign = team === 'home' ? 1 : -1;
    const enemy = team === 'home' ? 'away' : 'home';
    Object.assign(player(state, `${team}-0`), {x:9*sign,y:6});
    Object.assign(player(state, `${team}-1`), {x:6*sign,y:-5});
    Object.assign(player(state, `${team}-2`), {x:-6*sign,y:0});
    Object.assign(player(state, `${enemy}-0`), {x:-6*sign,y:0});
    Object.assign(state.ball, {ownerId:`${enemy}-0`,x:-6*sign,y:0});
    expect(planTeamMovement(state, team).find(p => p.playerId === `${team}-2`)!.action).toBe('cover');
    player(state, `${enemy}-0`).x = -12*sign; state.ball.x = -12*sign;
    player(state, `${team}-2`).x = -11*sign;
    expect(planTeamMovement(state, team).find(p => p.playerId === `${team}-2`)!.action).toBe('press');
  });
  it.each(['home', 'away'] as const)('keeps %s deep cover below midfield even with the ball far forward', team => {
    const state = setup(); const sign = team === 'home' ? 1 : -1;
    state.ball.ownerId = `${team}-0`; player(state, `${team}-0`).x = 12*sign;
    const targets = planTeamMovement(state, team);
    expect(targets.find(p => p.playerId === `${team}-2`)!.x * sign).toBeLessThanOrEqual(-8);
    state.ball.ownerId = team === 'home' ? 'away-1' : 'home-1';
    const enemy = player(state, state.ball.ownerId); enemy.x = -8*sign;
    player(state, `${team}-1`).x = enemy.x;
    const defense = planTeamMovement(state, team);
    const defender = defense.find(p => p.playerId === `${team}-2`)!;
    const middle = defense.find(p => p.playerId === `${team}-1`)!;
    expect(defender.x * sign).toBeLessThanOrEqual(middle.x * sign - 2);
  });
  it('uses one presser while midfield screens the passing lane and defense stays goal-side', () => {
    const state = setup();
    Object.assign(player(state, 'away-0'), {x:-6,y:4});
    Object.assign(player(state, 'away-1'), {x:1,y:-4});
    Object.assign(player(state, 'home-0'), {x:0,y:-4});
    Object.assign(player(state, 'home-1'), {x:-4,y:-2});
    Object.assign(player(state, 'home-2'), {x:-9,y:0});
    Object.assign(state.ball, {ownerId:'away-1',x:1,y:-4});
    const targets = planTeamMovement(state, 'home');
    expect(targets.filter(p => p.action === 'press').map(p => p.playerId)).toEqual(['home-0']);
    const middle = intent(state,'home-1'), defender = intent(state,'home-2');
    expect(middle.action).toBe('cover');
    expect(middle.x).toBeCloseTo(-2.5); expect(middle.y).toBeCloseTo(0);
    expect(defender.x).toBeLessThan(player(state,'away-0').x);
    expect(defender.x).toBeLessThan(middle.x);
  });
  it('sends only one chaser after a moving loose ball while the other roles hold shape', () => {
    const state = setup();
    Object.assign(state.ball,{ownerId:null,x:4,y:1,vx:8,vy:0});
    const targets=planTeamMovement(state,'home');
    const chasers=targets.filter(p=>p.action==='press');
    expect(chasers).toHaveLength(1); expect(chasers[0]!.x).toBeGreaterThan(4);
    expect(intent(state,'home-2').x).toBeLessThan(intent(state,'home-1').x);
    expect(targets.filter(p=>p.action!=='press')).toHaveLength(2);
  });
  it('gives possession a spaced attacker / connector / deep-cover structure with a settling deadzone', () => {
    const state = setup();
    state.ball.ownerId = 'home-3';
    player(state, 'home-3').x = -12;
    const targets = planTeamMovement(state, 'home');
    const attacker = targets.find(p => p.playerId === 'home-0')!;
    const middle = targets.find(p => p.playerId === 'home-1')!;
    const defender = targets.find(p => p.playerId === 'home-2')!;
    expect(attacker.x - middle.x).toBeGreaterThanOrEqual(3);
    expect(middle.x - defender.x).toBeGreaterThanOrEqual(3);
    expect(attacker.action).toBe('support');
    expect(middle.action).toBe('support');
    expect(defender.action).toBe('cover');
    for (const target of targets) {
      expect(target.arrivalRadius).toBeCloseTo(0.6);
      Object.assign(player(state, target.playerId), { x: target.x + 0.2, y: target.y });
    }
    const settled = planTeamMovement(state, 'home');
    settled.forEach(target => expect(Math.hypot(target.x - player(state, target.playerId).x,
      target.y - player(state, target.playerId).y)).toBeLessThan(target.arrivalRadius));
  });

  it('moves the attacker away from a blocked central passing lane', () => {
    const state=setup(); state.ball.ownerId='home-2';
    Object.assign(player(state,'home-2'),{x:-8,y:0});
    for(const p of state.players.filter(p=>p.team==='away')) Object.assign(p,{x:13,y:8});
    Object.assign(player(state,'away-0'),{x:-2.5,y:0});
    expect(Math.abs(intent(state,'home-0').y)).toBeGreaterThanOrEqual(3);
    expect(intent(state,'home-2').x).toBeLessThanOrEqual(-4);
  });
  it('does not send a presser into a securely held opposing keeper ball', () => {
    const state=setup(); state.ball.ownerId='away-3';
    const targets=planTeamMovement(state,'home');
    expect(targets.filter(p=>p.action==='press')).toHaveLength(0);
    expect(intent(state,'home-2').x).toBeLessThan(intent(state,'home-1').x);
  });
  it.each(['possession','defending','loose'] as const)('mirrors role plans for both teams during %s', phase => {
    const state=setup(); state.ball.ownerId=phase==='possession'?'home-1':phase==='defending'?'away-1':null;
    Object.assign(state.ball,{x:2,y:1,vx:4,vy:-1});
    const mirrored=structuredClone(state);
    const swap=(id:string)=>id.startsWith('home-')?id.replace('home-','away-'):id.replace('away-','home-');
    mirrored.players=state.players.map(p=>({...p,id:swap(p.id),team:p.team==='home'?'away':'home',x:-p.x,vx:-p.vx}));
    mirrored.ball={...state.ball,x:-state.ball.x,vx:-state.ball.vx,ownerId:state.ball.ownerId?swap(state.ball.ownerId):null};
    const first=planTeamMovement(state,'home'); const second=planTeamMovement(mirrored,'away');
    for(const a of first){const b=second.find(p=>p.playerId===swap(a.playerId))!;expect(b.x).toBeCloseTo(-a.x);expect(b.y).toBeCloseTo(a.y);expect(b.action).toBe(a.action);}
  });
  it('returns only uncontrolled outfielders, with pure deterministic bounded targets', () => {
    const state = setup();
    state.controlledId = 'home-0';
    state.ball.x = 100;
    state.ball.y = -100;
    const before = structuredClone(state);
    const result = planTeamMovement(state, 'home');
    expect(result.map(p => p.playerId)).toEqual(['home-1', 'home-2']);
    expect(result).toEqual(planTeamMovement(state, 'home'));
    expect(state).toEqual(before);
    for (const target of result) {
      expect(Number.isFinite(target.x) && Number.isFinite(target.y)).toBe(true);
      expect(Math.abs(target.x)).toBeLessThanOrEqual(FIELD.width / 2 - FIELD.playerRadius);
      expect(Math.abs(target.y)).toBeLessThanOrEqual(FIELD.height / 2 - FIELD.playerRadius);
      expect(target.arrivalRadius).toBeGreaterThan(0);
    }
  });
});

 describe('tacticalRoleOf', () => {
  it('honors explicit roles, legacy slots, unknown outfielders and keeper exclusion', () => {
    const state = createGame();
    const player = state.players[0]!;
    expect(tacticalRoleOf({ ...player, tacticalRole: undefined, id: 'home-0' })).toBe('attacker');
    expect(tacticalRoleOf({ ...player, tacticalRole: undefined, id: 'away-1' })).toBe('midfielder');
    expect(tacticalRoleOf({ ...player, tacticalRole: undefined, id: 'home-2' })).toBe('defender');
    expect(tacticalRoleOf({ ...player, tacticalRole: undefined, id: 'guest' })).toBe('midfielder');
    expect(tacticalRoleOf({ ...player, tacticalRole: 'defender' })).toBe('defender');
    expect(tacticalRoleOf({ ...player, role: 'keeper', tacticalRole: 'attacker' })).toBeNull();
  });
});
