export type Team = 'home' | 'away';
export type TacticalRole = 'attacker' | 'midfielder' | 'defender';
export interface Vec2 { x: number; y: number }
export interface Player extends Vec2 { id: string; team: Team; role: 'outfield' | 'keeper'; tacticalRole?: TacticalRole; vx: number; vy: number; facing: number; stamina: number }
export interface Ball extends Vec2 { vx: number; vy: number; z: number; vz: number; ownerId: string | null }
export interface InputState { moveX: number; moveY: number; shoot: boolean; pass: boolean; sprint: boolean; switchPlayer: boolean }
export interface GameState { players: Player[]; ball: Ball; score: Record<Team, number>; timeRemaining: number; phase: 'ready' | 'playing' | 'goal' | 'resetting' | 'finished'; phaseTimer: number; controlledId: string; lastScorer: Team | null; elapsed: number }
export interface MatchConfig { duration: number; difficulty: 'easy' | 'normal' | 'hard' }
export interface MatchResult { id: string; home: number; away: number; duration: number; createdAt: string }
export const FIELD = { width: 32, height: 20, goalWidth: 7, goalDepth: 2, playerRadius: 0.62, ballRadius: 0.28 } as const;
export const DEFAULT_CONFIG: MatchConfig = { duration: 120, difficulty: 'normal' };
export const EMPTY_INPUT: InputState = { moveX: 0, moveY: 0, shoot: false, pass: false, sprint: false, switchPlayer: false };
