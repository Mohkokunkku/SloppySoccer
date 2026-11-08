import { describe, expect, it } from 'vitest';
import { PhaseAnnouncement } from './phase-announcement';
import type { GameState } from '../shared/types';

const note = 'P1 Spain →';
const snapshot = (phase: GameState['phase'], home = 0, away = 0) => ({ phase, score: { home, away } });

describe('phase announcement lifecycle', () => {
  it('announces entering, spotlight with Skip intro, then actual play despite unchanged none overlay', () => {
    const cache = new PhaseAnnouncement();
    expect(cache.update(snapshot('ready'), false, note)).toBeNull();
    expect(cache.update(snapshot('entering'), false, note)).toBe('Both teams are entering the pitch.');
    expect(cache.update(snapshot('intro'), false, note)).toBe('Team spotlight. Meet both teams; Skip intro is available.');
    expect(cache.update(snapshot('playing'), false, note)).toBe(`Match in play. ${note}`);
  });

  it.each([[1, 0], [0, 1]] as const)('announces goal score %i–%i and return to kickoff before play resumes', (home, away) => {
    const cache = new PhaseAnnouncement();
    expect(cache.update(snapshot('playing'), false, note)).toBe(`Match in play. ${note}`);
    expect(cache.update(snapshot('goal', home, away), false, note)).toBe(`Goal! Spain ${home}, Argentina ${away}. Celebrating the goal.`);
    expect(cache.update(snapshot('goal', home, away), false, note)).toBeNull();
    expect(cache.update(snapshot('resetting', home, away), false, note)).toBe('Players returning to kickoff. Play has not resumed.');
    expect(cache.update(snapshot('resetting', home, away), false, note)).toBeNull();
    expect(cache.update(snapshot('playing', home, away), false, note)).toBe(`Match in play. ${note}`);
  });

  it('never announces active play while players return to kickoff', () => {
    const cache = new PhaseAnnouncement();
    expect(cache.update(snapshot('resetting', 2, 1), false, note)).toBe('Players returning to kickoff. Play has not resumed.');
  });

  it('emits nothing on repeated animation frames in every phase', () => {
    const cache = new PhaseAnnouncement();
    for (const phase of ['ready', 'entering', 'intro', 'playing', 'goal', 'resetting', 'finished'] as const) {
      cache.update(snapshot(phase), false, note);
      for (let frame = 0; frame < 120; frame++) expect(cache.update(snapshot(phase), false, note)).toBeNull();
    }
  });

  it('announces pause once and restores the actual phase on resume', () => {
    const cache = new PhaseAnnouncement();
    for (const phase of ['entering', 'intro', 'playing', 'goal', 'resetting'] as const) {
      const text = cache.update(snapshot(phase), false, note);
      expect(text).not.toBeNull();
      expect(cache.update(snapshot(phase), true, note)).toBe('Match paused.');
      expect(cache.update(snapshot(phase), true, note)).toBeNull();
      expect(cache.update(snapshot(phase), false, note)).toBe(text);
    }
  });

  it.each([[3, 1, 'A tiny, mighty win!'], [1, 3, 'The rematch is yours.'], [2, 2, 'Honours even.']] as const)(
    'keeps accurate full-time score %i–%i and result on later frames', (home, away, title) => {
      const cache = new PhaseAnnouncement();
      const state = snapshot('finished', home, away);
      expect(cache.update(state, false, note)).toBe(`Full time. Spain ${home}, Argentina ${away}. ${title}`);
      for (let frame = 0; frame < 120; frame++) expect(cache.update(state, false, note)).toBeNull();
    },
  );

  it('allows a new match to repeat the entrance announcement after setup reset', () => {
    const cache = new PhaseAnnouncement();
    const first = cache.update(snapshot('entering'), false, note);
    cache.update(snapshot('ready'), false, note);
    expect(cache.update(snapshot('entering'), false, note)).toBe(first);
  });
});
