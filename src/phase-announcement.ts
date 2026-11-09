import type { GameState } from '../shared/types';
import { matchPresentation } from './model';

type AnnouncementState = Pick<GameState, 'phase' | 'score'>;

/** Returns text only at announcement transitions, independently of DOM writes. */
export class PhaseAnnouncement {
  private lastTransition = '';

  update(state: AnnouncementState, paused: boolean, teamNote: string): string | null {
    const view = matchPresentation(state.phase, paused, state.score.home, state.score.away);
    const transition = `${state.phase}:${paused}`;
    if (transition === this.lastTransition) return null;
    this.lastTransition = transition;
    if (state.phase === 'finished') return `Full time. Spain ${state.score.home}, Argentina ${state.score.away}. ${view.title}`;
    if (paused) return 'Match paused.';
    if (state.phase === 'ready') return null;
    if (state.phase === 'entering') return 'Both teams are entering the pitch.';
    if (state.phase === 'intro') return 'Team spotlight. Meet both teams; Skip intro is available.';
    if (state.phase === 'goal') return `Goal! Spain ${state.score.home}, Argentina ${state.score.away}. Celebrating the goal.`;
    if (state.phase === 'resetting') return 'Players returning to kickoff. Play has not resumed.';
    if (state.phase === 'playing') return `Match in play. ${teamNote}`;
    return null;
  }
}
