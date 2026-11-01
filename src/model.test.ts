import { describe, expect, it } from 'vitest';
import { formatTime, sanitizeConfig, matchPresentation, SaveOnce } from './model';

it('posts a finished match once, even while its first save is pending, and permits a new match', async () => {
  const save = new SaveOnce();
  let count = 0;
  let resolve!: () => void;
  const request = () => { count++; return new Promise<void>(done => { resolve = done; }); };
  const first = save.run('match-1', request);
  await save.run('match-1', request);
  expect(count).toBe(1);
  resolve(); await first;
  await save.run('match-1', request);
  expect(count).toBe(1);
  await save.run('match-2', async () => { count++; });
  expect(count).toBe(2);
});

it('does not retry a failed final-score POST automatically', async () => {
  const save = new SaveOnce(); let count = 0;
  await expect(save.run('match-1', async () => { count++; throw new Error('offline'); })).rejects.toThrow('offline');
  await save.run('match-1', async () => { count++; });
  expect(count).toBe(1);
});

describe('match presentation', () => {
  it('separates ready, playing, goal, paused and full-time overlays', () => {
    expect(matchPresentation('ready', false, 0, 0)).toMatchObject({ overlay: 'ready', title: 'Ready for kick-off?' });
    expect(matchPresentation('playing', false, 0, 0).overlay).toBe('none');
    expect(matchPresentation('goal', false, 1, 0).overlay).toBe('none');
    expect(matchPresentation('playing', true, 1, 0).overlay).toBe('paused');
    expect(matchPresentation('finished', false, 2, 1).title).toBe('A tiny, mighty win!');
    expect(matchPresentation('finished', false, 1, 2).title).toBe('The rematch is yours.');
    expect(matchPresentation('finished', false, 1, 1).title).toBe('Honours even.');
  });
  it('formats the countdown with stable whole-second display and clamps invalid values', () => {
    expect(formatTime(120)).toBe('2:00');
    expect(formatTime(59.1)).toBe('1:00');
    expect(formatTime(-3)).toBe('0:00');
    expect(formatTime(Number.NaN)).toBe('0:00');
  });
  it('accepts only supported match choices from the API', () => {
    expect(sanitizeConfig({ duration: 60, difficulty: 'hard' })).toEqual({ duration: 60, difficulty: 'hard' });
    expect(sanitizeConfig({ duration: 9999, difficulty: '<script>' })).toEqual({ duration: 120, difficulty: 'normal' });
    expect(sanitizeConfig(null)).toEqual({ duration: 120, difficulty: 'normal' });
  });
});
