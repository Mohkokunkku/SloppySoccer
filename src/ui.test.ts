import { expect, it } from 'vitest';
import { completedPayload } from './ui';
import { createGame, startGame } from '../shared/engine';

it('only prepares the accepted score fields after full-time', () => {
  const state = createGame({ duration: 60 });
  expect(completedPayload(state, 60)).toBeNull();
  startGame(state);
  expect(completedPayload(state, 60)).toBeNull();
  state.phase = 'finished';
  state.score = { home: 3, away: 2 };
  expect(completedPayload(state, 60)).toEqual({ home: 3, away: 2, duration: 60 });
});
