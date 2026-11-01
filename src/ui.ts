import type { GameState } from '../shared/types';

/** Deliberately exclude client IDs, difficulty and any other API fields. */
export function completedPayload(state: GameState, duration: number): { home: number; away: number; duration: number } | null {
  return state.phase === 'finished'
    ? { home: state.score.home, away: state.score.away, duration }
    : null;
}
