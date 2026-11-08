import { describe, expect, it } from 'vitest';
import { planTeamMovement, tacticalRoleOf } from './tactics.js';
import { formationPosition, formationRole } from './formations.js';
import { DEFAULT_TUNING } from './tuning.js';
import type { Formation, GameState, Team } from './types.js';

const setup = (formation: Formation): GameState => ({
  formations:{home:formation,away:formation}, controls:[], controlledId:'none',
  players:(['home','away'] as Team[]).flatMap(team => [0,1,2,3,4].map(slot => ({
    id:`${team}-${slot}`,team,role:slot === 3 ? 'keeper' as const : 'outfield' as const,
    tacticalRole:formationRole(slot,formation) ?? undefined,
    ...formationPosition(team,slot,false,DEFAULT_TUNING,formation),vx:0,vy:0,facing:0,stamina:1,
  }))),
  ball:{x:0,y:0,z:0,vx:0,vy:0,vz:0,ownerId:null},score:{home:0,away:0},
  timeRemaining:120,phase:'playing',phaseTimer:0,lastScorer:null,elapsed:0,
});

describe('five-a-side tactical planning', () => {
  it('excludes every human on either team rather than the legacy alias', () => {
    const state=setup('2-1-1');
    state.controls=[{seatId:'p1',team:'home',playerId:'home-1'},{seatId:'p2',team:'home',playerId:'home-4'},
      {seatId:'p3',team:'away',playerId:'away-0'},{seatId:'p4',team:'away',playerId:'away-2'}];
    state.controlledId='home-0';
    expect(planTeamMovement(state,'home').map(p=>p.playerId)).toEqual(['home-0','home-2']);
    expect(planTeamMovement(state,'away').map(p=>p.playerId)).toEqual(['away-1','away-4']);
  });
  for(const formation of ['2-1-1','1-2-1'] as const) {
    for(const phase of ['possession','defending','loose'] as const) {
      it(`${formation} maintains duplicate-role lanes during ${phase} without mutation`, () => {
        const state=setup(formation);
        state.ball.ownerId=phase==='possession'?'home-3':phase==='defending'?'away-3':null;
        const before=structuredClone(state);
        const targets=planTeamMovement(state,'home');
        const role=formation==='2-1-1'?'defender':'midfielder';
        const duplicates=targets.filter(t=>tacticalRoleOf(state.players.find(p=>p.id===t.playerId)!)===role);
        expect(Math.abs(duplicates[0]!.y-duplicates[1]!.y)).toBeGreaterThanOrEqual(4);
        expect(targets.filter(t=>t.action==='press').length).toBeLessThanOrEqual(1);
        const middle=targets.filter(t=>tacticalRoleOf(state.players.find(p=>p.id===t.playerId)!)==='midfielder');
        for(const target of targets.filter(t=>tacticalRoleOf(state.players.find(p=>p.id===t.playerId)!)==='defender'&&t.action!=='press')) {
          expect(target.x).toBeLessThanOrEqual(Math.min(...middle.map(t=>t.x))-2);
        }
        expect(state).toEqual(before);
        expect(planTeamMovement(state,'home')).toEqual(targets);
      });
    }
  }
  it('keeps keeper-ID fallback and fourth outfield fallback compatible', () => {
    const player=setup('2-1-1').players[0]!;
    expect(tacticalRoleOf({...player,id:'away-3',tacticalRole:undefined})).toBeNull();
    expect(tacticalRoleOf({...player,id:'home-4',tacticalRole:undefined})).toBe('defender');
  });
  it.each(['2-1-1','1-2-1'] as const)('mirrors and scales %s lanes with stable arrival targets', formation => {
    const state=setup(formation); state.ball.ownerId='home-3';
    const targets=planTeamMovement(state,'home');
    for(const target of targets) {
      const p=state.players.find(p=>p.id===target.playerId)!;
      p.x=target.x+0.1; p.y=target.y;
    }
    for(const target of planTeamMovement(state,'home')) {
      const p=state.players.find(p=>p.id===target.playerId)!;
      expect(Math.hypot(p.x-target.x,p.y-target.y)).toBeLessThan(target.arrivalRadius);
    }
    const scaled=structuredClone(state);
    scaled.tuning={...DEFAULT_TUNING,fieldWidth:48,fieldHeight:30};
    scaled.players.forEach(p=>{p.x*=1.5;p.y*=1.5;});
    for(const target of planTeamMovement(scaled,'home')) {
      const base=targets.find(t=>t.playerId===target.playerId)!;
      expect(target.x).toBeCloseTo(base.x*1.5); expect(target.y).toBeCloseTo(base.y*1.5);
    }
    const mirrored=structuredClone(state);
    const swap=(id:string)=>id.replace(/^(home|away)/,team=>team==='home'?'away':'home');
    mirrored.players=state.players.map(p=>({...p,id:swap(p.id),team:p.team==='home'?'away':'home',x:-p.x,vx:-p.vx}));
    mirrored.ball.ownerId='away-3';
    for(const target of planTeamMovement(mirrored,'away')) {
      const base=targets.find(t=>t.playerId===swap(target.playerId))!;
      expect(target.x).toBeCloseTo(-base.x); expect(target.y).toBeCloseTo(base.y);
    }
  });
});
