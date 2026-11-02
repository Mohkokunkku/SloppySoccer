import { FIELD, type GameState, type Player, type TacticalRole, type Team } from './types.js';

export interface TacticalIntent {
  playerId: string;
  x: number;
  y: number;
  action: 'carry' | 'support' | 'press' | 'cover' | 'hold';
  arrivalRadius: number;
}

const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, Number.isFinite(n) ? n : 0));
const limitX = FIELD.width / 2 - FIELD.playerRadius;
const limitY = FIELD.height / 2 - FIELD.playerRadius;

const signFor = (team: Team) => team === 'home' ? 1 : -1;
function laneDistance(p: Player, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const t = clamp(((p.x - ax) * dx + (p.y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - ax - t * dx, p.y - ay - t * dy);
}
function openAttackingLane(state: GameState, team: Team, origin: {x:number;y:number}, forward: number) {
  const sign = signFor(team);
  const opponents = state.players.filter(p => p.team !== team);
  const candidates = [-6, -3, 0, 3, 6].map(y => ({x: forward * sign, y}));
  const score = (target: {x:number;y:number}) => {
    const space = Math.min(12, ...opponents.map(p => Math.hypot(p.x - target.x, p.y - target.y)));
    const lane = Math.min(8, ...opponents.map(p => laneDistance(p, origin.x, origin.y, target.x, target.y)));
    return space * 0.6 + lane * 2 - Math.abs(target.y) * 0.08;
  };
  return candidates.sort((a, b) => score(b) - score(a))[0]!;
}
export function planTeamMovement(state: GameState, team: Team): TacticalIntent[] {
  const sign = signFor(team);
  const owner = state.players.find(p => p.id === state.ball.ownerId);
  const origin = owner ?? state.ball;
  const ballA = origin.x * sign;
  const ownBall = owner?.team === team;
  const forward = openAttackingLane(state, team, origin, clamp(ballA + 6, 3, 12));
  const figures = state.players.filter(p => p.team === team && p.role === 'outfield' && p.id !== state.controlledId);
  const opponents = state.players.filter(p => p.team !== team && p.role === 'outfield');
  const enemyAttacker = opponents.find(p => tacticalRoleOf(p) === 'attacker') ?? owner ?? state.ball;
  const enemyMiddle = opponents.find(p => tacticalRoleOf(p) === 'midfielder') ?? owner ?? state.ball;
  const pressureCost = (p: Player) => Math.hypot(p.x - origin.x, p.y - origin.y)
    + (tacticalRoleOf(p) === 'defender' && ballA > -5 ? 4 : tacticalRoleOf(p) === 'midfielder' ? 0.5 : 0);
  const presser = !ownBall && owner?.role !== 'keeper'
    ? [...figures].sort((a, b) => pressureCost(a) - pressureCost(b) || a.id.localeCompare(b.id))[0] : undefined;
  return figures.map(p => {
    const role = tacticalRoleOf(p);
    let x = p.x, y = p.y;
    let action: TacticalIntent['action'] = 'hold';
    let arrivalRadius = 0.6;
    if (ownBall) {
      if (owner.id === p.id) {
        x = sign * (role === 'defender' ? clamp(p.x * sign + 2, -11, -4) : role === 'midfielder' ? Math.min(7, p.x * sign + 3) : Math.min(14, p.x * sign + 4));
        y = p.y * 0.6; action = 'carry'; arrivalRadius = 0.2;
      } else if (role === 'attacker') {
        x = forward.x; y = forward.y; action = 'support';
      } else if (role === 'midfielder') {
        x = clamp(ballA - 2, -4, 6) * sign;
        y = clamp((forward.y >= 0 ? -3.5 : 3.5) + origin.y * 0.2, -5, 5); action = 'support';
      } else {
        x = clamp(ballA - 8, -11, -4) * sign; y = clamp(origin.y * 0.25, -3, 3); action = 'cover';
      }
    } else if (p.id === presser?.id) {
      const lead = owner ? 0.12 : 0.25;
      x = state.ball.x + state.ball.vx * lead; y = state.ball.y + state.ball.vy * lead;
      action = 'press'; arrivalRadius = 0.2;
    } else if (!owner) {
      x = sign * (role === 'attacker' ? clamp(ballA + 4, 0, 10) : role === 'midfielder' ? clamp(ballA - 2, -5, 3) : clamp(ballA - 7, -11, -4));
      y = role === 'attacker' ? -4 : role === 'midfielder' ? 3.5 : clamp(state.ball.y * 0.25,-3,3);
      action = role === 'attacker' ? 'hold' : 'cover';
    } else {
      if (role === 'defender') {
        x = clamp(enemyAttacker.x * sign - 2, -12, -4) * sign;
        y = clamp(enemyAttacker.y * 0.65, -4.5, 4.5); action = 'cover';
      } else if (role === 'midfielder') {
        x = clamp((enemyMiddle.x + enemyAttacker.x) * sign / 2, -9, 3) * sign;
        y = clamp((enemyMiddle.y + enemyAttacker.y) / 2, -6.5, 6.5); action = 'cover';
      } else {
        x = clamp(ballA + 3, -2, 8) * sign; y = origin.y >= 0 ? -4 : 4; action = 'hold';
      }
    }
    return {playerId:p.id,x:clamp(x,-limitX,limitX),y:clamp(y,-limitY,limitY),action,arrivalRadius};
  });
}

export function tacticalRoleOf(player: Player): TacticalRole | null {
  if (player.role === 'keeper') return null;
  return player.tacticalRole ?? ({ '0': 'attacker', '1': 'midfielder', '2': 'defender' } as const)[
    player.id.match(/-(0|1|2)$/)?.[1] as '0' | '1' | '2'
  ] ?? 'midfielder';
}
