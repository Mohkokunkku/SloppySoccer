import { DEFAULT_CONFIG, type MatchConfig, type GameState } from '../shared/types';

export function matchPresentation(phase: GameState['phase'], paused: boolean, home: number, away: number): { overlay: 'ready' | 'paused' | 'finished' | 'none'; title: string } {
  if (phase === 'ready') return { overlay: 'ready', title: 'Ready for kick-off?' };
  if (phase === 'finished') return { overlay: 'finished', title: home > away ? 'A tiny, mighty win!' : home < away ? 'The rematch is yours.' : 'Honours even.' };
  if (paused) return { overlay: 'paused', title: 'Taking a breather.' };
  return { overlay: 'none', title: '' };
}

export class SaveOnce {
  private attempted = new Set<string>();
  async run(id: string, save: () => Promise<void>): Promise<void> {
    if (this.attempted.has(id)) return;
    this.attempted.add(id);
    await save();
  }
}

export function formatTime(seconds: number): string {
  const time = Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0;
  return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`;
}

export function sanitizeConfig(value: unknown): MatchConfig {
  const candidate = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    duration: [60, 120, 180].includes(Number(candidate.duration)) ? Number(candidate.duration) : DEFAULT_CONFIG.duration,
    difficulty: candidate.difficulty === 'easy' || candidate.difficulty === 'hard' || candidate.difficulty === 'normal' ? candidate.difficulty : DEFAULT_CONFIG.difficulty,
  };
}
