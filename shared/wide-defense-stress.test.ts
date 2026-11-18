import { describe, expect, it } from 'vitest';
import { createGame, stepGame } from './engine.js';
import { planTeamMovement } from './tactics.js';
import { DEFAULT_TUNING } from './tuning.js';
import type { GameState, Team } from './types.js';

function fixture(team: Team, owner: 'own' | 'enemy' | 'loose' = 'own'): GameState {
  const state = createGame();
  state.phase = 'playing'; state.controls = []; state.controlledId = 'none';
  state.tuning = { ...DEFAULT_TUNING, fieldWidth: 32, fieldHeight: 20 };
  const sign = team === 'home' ? 1 : -1, enemy = team === 'home' ? 'away' : 'home';
  const put = (id: string, x: number, y: number) => Object.assign(state.players.find(p => p.id === id)!, { x: x * sign, y, vx: 0, vy: 0 });
  put(`${team}-0`, 1, 6); put(`${team}-1`, 3, -5); put(`${team}-2`, -9, -4.5); put(`${team}-4`, -9, 4.5);
  put(`${enemy}-0`, owner === 'enemy' ? -6 : 8, owner === 'enemy' ? -7 : 5);
  put(`${enemy}-1`, 9, -7); put(`${enemy}-2`, 10, 7);
  const carrier = owner === 'own' ? `${team}-0` : owner === 'enemy' ? `${enemy}-0` : null;
  Object.assign(state.ball, { ownerId: carrier, x: owner === 'loose' ? 0 : state.players.find(p => p.id === carrier)!.x,
    y: owner === 'loose' ? -7 : state.players.find(p => p.id === carrier)!.y, vx: 0, vy: 0 });
  return state;
}

describe('wide defense stress behavior', () => {
  it.each([['home', 1], ['away', -1]] as const)('%s holds a wide, shallow line in possession and loose-ball phases', (team, sign) => {
    for (const phase of ['own', 'loose'] as const) {
      const d = planTeamMovement(fixture(team, phase), team).filter(t => t.playerId === `${team}-2` || t.playerId === `${team}-4`);
      expect(d.every(t=>t.action!=='press')).toBe(true);
      expect(Math.abs(d[0]!.y - d[1]!.y)).toBeGreaterThanOrEqual(6);
      expect(Math.abs(d[0]!.x - d[1]!.x)).toBeLessThan(1.5);
      expect(Math.abs(d[0]!.x - d[1]!.x)).toBeGreaterThan(0.15);
      expect(d.map(t => Math.sign(t.y)).sort()).toEqual([-1, 1]);
      expect(d.every(t => t.x * sign < 0)).toBe(true);
    }
  });

  it.each(['home', 'away'] as const)('keeps one defender goal-side when %s defender presses a wing carrier', team => {
    const state = fixture(team, 'enemy'), sign = team === 'home' ? 1 : -1;
    const d = planTeamMovement(state, team).filter(t => t.playerId === `${team}-2` || t.playerId === `${team}-4`);
    const press = d.find(t => t.action === 'press')!, cover = d.find(t => t.action === 'cover')!;
    expect(press).toBeDefined(); expect(cover).toBeDefined();
    expect((press.x - cover.x) * sign).toBeGreaterThanOrEqual(4);
    expect((state.ball.x - cover.x) * sign).toBeGreaterThanOrEqual(3);
    expect(Math.abs(cover.y)).toBeLessThan(5);
  });

  it('retreats into separated cover positions over real engine ticks', () => {
    const state = fixture('home', 'enemy');
    state.controls=[{seatId:'p1',team:'away',playerId:'away-0'}];
    const press=state.players.find(p=>p.id==='home-2')!,cover=state.players.find(p=>p.id==='home-4')!;
    const initialPress=press.x,initialCover=cover.x;
    for (let tick = 0; tick < 15; tick++) {
      stepGame(state, { moveX: 0, moveY: 0, shoot: false, pass: false, sprint: false, switchPlayer: false }, 1 / 60);
    }
    expect(state.ball.ownerId).toBe('away-0');
    expect(press.x-initialPress).toBeGreaterThan(.4);
    expect(cover.x-initialCover).toBeLessThan(-.1);
    expect(Math.abs(press.y-cover.y)).toBeGreaterThan(4);
  });

  it('does not replace a human defender or keeper with an AI press', () => {
    const state = fixture('home', 'enemy');
    state.controls = [{ seatId: 'human', team: 'home', playerId: 'home-2' }];
    expect(planTeamMovement(state, 'home').some(t => t.playerId === 'home-2')).toBe(false);
    state.controls = [];
    state.ball.ownerId = 'away-3';
    expect(planTeamMovement(state, 'home').some(t => t.action === 'press')).toBe(false);
    expect(planTeamMovement(state, 'home').some(t => t.playerId === 'home-3')).toBe(false);
  });

  it('does not invent a second defender in the 1-2-1 formation', () => {
    const state = createGame({ formations: { home: '1-2-1', away: '1-2-1' } });
    state.controls = []; state.controlledId = 'none'; state.phase = 'playing';
    const intents = planTeamMovement(state, 'home');
    expect(intents.filter(t => t.playerId === 'home-2' || (t.playerId === 'home-4' && t.action === 'cover'))).toHaveLength(1);
  });
});