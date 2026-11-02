import { expect, it } from 'vitest';
import { completedPayload, controlledRoleLabel } from './ui';
import { createGame, startGame } from '../shared/engine';

it.each([
  ['home-0', 'Attacker'], ['home-1', 'Midfielder'], ['home-2', 'Defender'],
  ['home-3', 'Goalkeeper'], ['missing', 'Player'],
])('labels controlled role %s without changing match state', (id, expected) => {
  const state = createGame(); state.controlledId = id;
  const before = structuredClone(state);
  expect(controlledRoleLabel(state)).toBe(expected);
  expect(state).toEqual(before);
});
it('labels legacy outfield figures without tactical metadata', () => {
  const state = createGame(); delete state.players[0]!.tacticalRole;
  expect(controlledRoleLabel(state)).toBe('Outfield player');
});
it('only prepares the accepted score fields after full-time', () => {
  const state = createGame({ duration: 60 });
  expect(completedPayload(state, 60)).toBeNull();
  startGame(state);
  expect(completedPayload(state, 60)).toBeNull();
  state.phase = 'finished';
  state.score = { home: 3, away: 2 };
  expect(completedPayload(state, 60)).toEqual({ home: 3, away: 2, duration: 60 });
});
