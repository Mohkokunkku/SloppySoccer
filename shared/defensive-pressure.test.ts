import { describe, expect, it } from 'vitest';
import { createGame, stepLocalGame } from './engine.js';
import { planTeamMovement } from './tactics.js';
import { DEFAULT_TUNING } from './tuning.js';
import type { Formation, GameState, Team } from './types.js';

function attack(team: Team, formation: Formation = '2-1-1'): GameState {
  const state = createGame({ formations: { home: formation, away: formation } });
  state.controls = [];
  state.controlledId = 'none';
  state.phase = 'playing';
  const sign = team === 'home' ? 1 : -1;
  const enemy = team === 'home' ? 'away' : 'home';
  const place = (id: string, x: number, y: number) => Object.assign(
    state.players.find(p => p.id === id)!, { x: x * sign, y, vx: 0, vy: 0 });
  place(`${team}-0`, 7, 7);
  place(`${team}-1`, 3, -5);
  place(`${team}-2`, -9, 0);
  place(`${team}-4`, -11, 5);
  place(`${enemy}-0`, -6, 0);
  place(`${enemy}-1`, -8, 5);
  place(`${enemy}-2`, 8, -7);
  place(`${enemy}-4`, 9, 7);
  Object.assign(state.ball, { ownerId: `${enemy}-0`, x: -6 * sign, y: 0, vx: 0, vy: 0 });
  return state;
}

describe('active defensive pressure', () => {
  it.each(['home', 'away'] as const)('screens the actual %s ball carrier instead of an unrelated attacker-role player', team => {
    const state = attack(team);
    const sign = team === 'home' ? 1 : -1;
    const enemy = team === 'home' ? 'away' : 'home';
    Object.assign(state.players.find(p => p.id === `${enemy}-0`)!, {x: 7 * sign, y: 7});
    Object.assign(state.players.find(p => p.id === `${enemy}-1`)!, {x: -6 * sign, y: 3});
    Object.assign(state.players.find(p => p.id === `${team}-2`)!, {y: 3});
    Object.assign(state.ball, {ownerId: `${enemy}-1`, y: 3});
    const cover = planTeamMovement(state, team).find(t => t.playerId === `${team}-4`)!;
    expect(cover.x * sign).toBeLessThan(-6);
    expect((cover.x * sign + 6) / -10).toBeCloseTo((cover.y - 3) / -3);
  });

  it('keeps two distinct cover positions when there is no useful forward receiver', () => {
    const state = attack('home');
    Object.assign(state.players.find(p => p.id === 'home-1')!, {x: -6.1, y: 0});
    for (const p of state.players.filter(p => p.team === 'away' && p.id !== 'away-0')) p.x = 10;
    const defenders = planTeamMovement(state, 'home').filter(t => ['home-2', 'home-4'].includes(t.playerId));
    expect(defenders.every(t => t.action === 'cover' && t.x < -6)).toBe(true);
    expect(Math.hypot(defenders[0]!.x - defenders[1]!.x, defenders[0]!.y - defenders[1]!.y)).toBeGreaterThan(1.4);
  });

  it.each(['home', 'away'] as const)('lets the nearest %s defender challenge an attack before the deep emergency zone', team => {
    const state = attack(team);
    const targets = planTeamMovement(state, team);
    expect(targets.filter(t => t.action === 'press').map(t => t.playerId)).toEqual([`${team}-2`]);
    const press = targets.find(t => t.playerId === `${team}-2`)!;
    expect(Math.hypot(press.x - state.ball.x, press.y - state.ball.y)).toBeLessThan(1);
    expect(targets.find(t => t.playerId === `${team}-4`)!.action).toBe('cover');
  });

  it.each(['home', 'away'] as const)('screens a forward pass with the second %s defender when midfield is pressing', team => {
    const state = attack(team);
    const sign = team === 'home' ? 1 : -1;
    Object.assign(state.players.find(p => p.id === `${team}-1`)!, {x: -6.1 * sign, y: 0});
    const targets = planTeamMovement(state, team);
    expect(targets.filter(t => t.action === 'press').map(t => t.playerId)).toEqual([`${team}-1`]);
    const shot = targets.find(t => t.playerId === `${team}-2`)!;
    const pass = targets.find(t => t.playerId === `${team}-4`)!;
    expect(Math.abs(shot.y)).toBeLessThan(0.25);
    expect(pass.y).toBeGreaterThan(1);
    expect(pass.x * sign).toBeGreaterThan(-8);
    expect(pass.x * sign).toBeLessThan(-6);
    // The intended receiver is (-8, 5), so both coordinates must be on
    // the real carrier-to-receiver segment, not a parallel kickoff rail.
    expect((pass.x * sign + 6) / -2).toBeCloseTo(pass.y / 5);
    expect(Math.hypot(shot.x - pass.x, shot.y - pass.y)).toBeGreaterThan(1);
  });

  it.each(['home', 'away'] as const)('moves the spare %s defender onto the shooting lane instead of fixed wide rails', team => {
    const state = attack(team);
    const sign = team === 'home' ? 1 : -1;
    const cover = planTeamMovement(state, team).find(t => t.playerId === `${team}-4`)!;
    expect(cover.action).toBe('cover');
    expect(Math.abs(cover.y)).toBeLessThan(0.25);
    expect(cover.x * sign).toBeLessThan(-6);
    expect(cover.x * sign).toBeGreaterThan(-11);
  });
});

for (const formation of ['2-1-1', '1-2-1'] as const) {
  describe(`${formation} defensive safeguards`, () => {
    it.each(['home', 'away'] as const)('lets a %s defender actually take possession through the real engine', team => {
      const state = attack(team, formation);
      const enemy = team === 'home' ? 'away' : 'home';
      const sign = team === 'home' ? 1 : -1;
      state.controls = [{seatId: 'p1', team: enemy, playerId: `${enemy}-0`}];
      const carrier = state.players.find(p => p.id === `${enemy}-0`)!;
      carrier.facing = sign === 1 ? Math.PI : 0;
      let won = false;
      for (let tick = 0; tick < 90; tick++) {
        stepLocalGame(state, {}, 1 / 60);
        if (state.ball.ownerId === `${team}-2`) { won = true; break; }
      }
      expect(won).toBe(true);
      expect(carrier.x).toBe(-6 * sign);
      expect(carrier.y).toBe(0);
      expect(state.score).toEqual({home: 0, away: 0});
    });

    it.each(['home', 'away'] as const)('challenges a %s wing attack outside the old central-only zone', team => {
      const state = attack(team, formation);
      const sign = team === 'home' ? 1 : -1;
      const enemy = team === 'home' ? 'away' : 'home';
      Object.assign(state.players.find(p => p.id === `${enemy}-0`)!, {y: 7});
      Object.assign(state.ball, {y: 7});
      Object.assign(state.players.find(p => p.id === `${team}-2`)!, {x: -8 * sign, y: 6});
      expect(planTeamMovement(state, team).find(t => t.playerId === `${team}-2`)!.action).toBe('press');
    });

    it('leaves human defenders and keeper possession authoritative', () => {
      const state = attack('home', formation);
      state.controls = [{seatId: 'p1', team: 'home', playerId: 'home-2'}];
      expect(planTeamMovement(state, 'home').some(t => t.playerId === 'home-2')).toBe(false);
      state.ball.ownerId = 'away-3';
      expect(planTeamMovement(state, 'home').some(t => t.action === 'press')).toBe(false);
      expect(planTeamMovement(state, 'home').some(t => t.playerId === 'home-3')).toBe(false);
    });

    it('preserves pure, deterministic, scaled active-defense targets', () => {
      const state = attack('home', formation);
      const before = structuredClone(state);
      const targets = planTeamMovement(state, 'home');
      expect(planTeamMovement(state, 'home')).toEqual(targets);
      expect(state).toEqual(before);
      const scaled = structuredClone(state);
      scaled.tuning = {...DEFAULT_TUNING, fieldWidth:48, fieldHeight:30};
      for (const p of [...scaled.players, scaled.ball]) { p.x *= 1.5; p.y *= 1.5; }
      for (const target of planTeamMovement(scaled, 'home')) {
        const base = targets.find(t => t.playerId === target.playerId)!;
        expect(target.x).toBeCloseTo(base.x * 1.5);
        expect(target.y).toBeCloseTo(base.y * 1.5);
        expect(target.action).toBe(base.action);
      }
    });
  });
}
