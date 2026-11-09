export type Team = 'home' | 'away';
export type TacticalRole = 'attacker' | 'midfielder' | 'defender';
export type Formation = '2-1-1' | '1-2-1';
export type InputDevice = 'keyboard1' | 'keyboard2' | `gamepad:${number}`;
export interface LocalSeat {id:string;team:Team;device:InputDevice}
export interface HumanControl {seatId:string;team:Team;playerId:string}
export interface Vec2 { x: number; y: number }
export interface Player extends Vec2 { id: string; team: Team; role: 'outfield' | 'keeper'; tacticalRole?: TacticalRole; vx: number; vy: number; facing: number; stamina: number }
export interface Ball extends Vec2 { release?:{id:number;type:'shot'|'pass'|'clearance';playerId:string}; vx: number; vy: number; z: number; vz: number; ownerId: string | null }
export interface InputState { moveX: number; moveY: number; shoot: boolean; pass: boolean; sprint: boolean; switchPlayer: boolean }
export interface GameTuning { fieldWidth:number; fieldHeight:number; goalWidth:number; goalHeight:number; runSpeed:number; sprintMultiplier:number; kickPower:number; passPower:number; keeperPower:number; acceleration:number; turnRate:number }
export interface GameState { formations?:Record<Team,Formation>;controls?:HumanControl[];introEnabled?:boolean; entrance?:{fieldHeight:number;exitY:number;completed:string[]}; tuning?:GameTuning; players: Player[]; ball: Ball; score: Record<Team, number>; timeRemaining: number; phase: 'ready' | 'entering' | 'intro' | 'playing' | 'goal' | 'resetting' | 'finished'; phaseTimer: number; controlledId: string; lastScorer: Team | null; elapsed: number }
export interface MatchConfig { duration: number; difficulty: 'easy' | 'normal' | 'hard';formations?:Record<Team,Formation> }
export interface MatchResult { id: string; home: number; away: number; duration: number; createdAt: string }
export const FIELD = { width: 32, height: 20, goalWidth: 7, goalDepth: 2, playerRadius: 0.62, ballRadius: 0.28 } as const;
export const DEFAULT_CONFIG: MatchConfig = { duration: 120, difficulty: 'normal' };
export const EMPTY_INPUT: InputState = { moveX: 0, moveY: 0, shoot: false, pass: false, sprint: false, switchPlayer: false };
