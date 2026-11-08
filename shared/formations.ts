import type { Formation, GameTuning, TacticalRole, Team } from './types.js';

export const DEFAULT_FORMATIONS: Record<Team, Formation> = {home:'2-1-1',away:'2-1-1'};

export function sanitizeFormations(value: unknown): Record<Team, Formation> {
  const candidate = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {home:candidate.home === '1-2-1' ? '1-2-1' : '2-1-1',
    away:candidate.away === '1-2-1' ? '1-2-1' : '2-1-1'};
}

export function formationRole(slot: number, formation: Formation): TacticalRole | null {
  if (slot === 0) return 'attacker';
  if (slot === 1) return 'midfielder';
  if (slot === 2) return 'defender';
  if (slot === 4) return formation === '1-2-1' ? 'midfielder' : 'defender';
  return null;
}

export function formationPosition(team: Team, slot: number, receiving: boolean,
  tuning: Readonly<GameTuning>, formation: Formation): {x:number;y:number} {
  const positions = formation === '1-2-1'
    ? [[receiving ? -3 : -1,0],[-5,-4.5],[-10,0],[-14.6,0],[-5,4.5]]
    : [[receiving ? -3 : -1,0],[-5,0],[-10,-4.5],[-14.6,0],[-10,4.5]];
  const [x,y] = positions[slot] ?? [0,0];
  return {x:x! * (team === 'home' ? 1 : -1) * tuning.fieldWidth / 32,
    y:y! * tuning.fieldHeight / 20};
}
