import { describe, expect, it, vi } from 'vitest';
import { PostMatchDirector, POST_MATCH_DURATION, POST_MATCH_THEME_NAMES } from './post-match';
import type { GameState } from '../shared/types';

const state = (home: number, away: number): Pick<GameState, 'phase' | 'score'> => ({ phase: 'finished', score: { home, away } });

describe('PostMatchDirector', () => {
  it('exports three themes and chooses/clamps the injected theme exactly once', () => {
    expect(POST_MATCH_DURATION).toBe(34);
    expect(POST_MATCH_THEME_NAMES).toHaveLength(3);
    const random = vi.fn(() => 1);
    expect(new PostMatchDirector(state(2, 1), 'a', random).view.theme).toBe(2);
    expect(random).toHaveBeenCalledTimes(1);
    expect(new PostMatchDirector(state(2, 1), 'b', () => -1).view.theme).toBe(0);
    expect(new PostMatchDirector(state(2, 1), 'c', () => Number.NaN).view.theme).toBe(0);
  });

  it.each([[2, 1, 'home'], [1, 2, 'away']] as const)('segments winner %s-%s', (home, away, winner) => {
    const d = new PostMatchDirector(state(home, away), 'win', () => 0);
    expect(d.view.winner).toBe(winner);
    for (let i = 0; i < 24; i++) d.update(0.25); expect(d.view.segment).toBe('losers');
    for (let i = 0; i < 12; i++) d.update(0.25); expect(d.view.segment).toBe('finale');
    for (let i = 0; i < 28; i++) d.update(0.25); expect(d.view.segment).toBe('handshake');
    for (let i = 0; i < 72; i++) d.update(0.25); expect(d.view.segment).toBe('done');
    expect(d.view.active).toBe(false);
  });

  it('keeps a draw neutral for eight seconds then includes the fair-play line', () => {
    const d = new PostMatchDirector(state(1, 1), 'draw', () => 0);
    expect(d.view).toMatchObject({ winner: null, segment: 'draw' });
    for (let i = 0; i < 32; i++) d.update(0.25);
    expect(d.view.segment).toBe('handshake');for(let i=0;i<72;i++)d.update(.25);expect(d.view.segment).toBe('done');
  });

  it('pauses, ignores invalid deltas, caps advancement, snapshots score and finishes stably', () => {
    const input = state(3, 1);
    const d = new PostMatchDirector(input, 'stable', () => 0);
    input.score.home = 0;
    expect(d.view.winner).toBe('home');
    expect(d.update(1, true).elapsed).toBe(0);
    for (const dt of [0, -1, NaN, Infinity]) expect(d.update(dt).elapsed).toBe(0);
    d.update(1); expect(d.view.elapsed).toBe(0.25);
    d.skip(); const done = d.view;
    expect(done).toMatchObject({ active: false, segment: 'done' });
    expect(d.update(1)).toEqual(done);
    d.skip(); expect(d.view).toEqual(done);
  });
});