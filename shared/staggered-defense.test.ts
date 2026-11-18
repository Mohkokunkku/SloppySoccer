import {describe,expect,it} from 'vitest';
import {createGame,stepLocalGame} from './engine';
import {planTeamMovement} from './tactics';
import {DEFAULT_TUNING} from './tuning';
import type {GameState,Team} from './types';
function shape(team:Team='home',wing=-1):GameState{
 const state=createGame();state.phase='playing';state.controls=[];state.controlledId='none';state.tuning={...DEFAULT_TUNING,fieldWidth:32,fieldHeight:20};
 const sign=team==='home'?1:-1;
 const put=(id:string,x:number,y:number)=>Object.assign(state.players.find(p=>p.id===id)!,{x:x*sign,y,vx:0,vy:0});
 put(`${team}-0`,1,wing*6);put(`${team}-1`,-2,0);put(`${team}-2`,-10,-4.5);put(`${team}-4`,-10,4.5);
 Object.assign(state.ball,{ownerId:`${team}-0`,x:sign,y:wing*6,vx:0,vy:0});return state;
}
describe('wide backline with a small dynamic offset',()=>{
 it.each([-1,1])('shades toward wing %s without squeezing both defenders together',wing=>{
  const state=shape('home',wing),targets=planTeamMovement(state,'home');
  const near=targets.find(t=>t.playerId===(wing<0?'home-2':'home-4'))!;
  const spare=targets.find(t=>t.playerId===(wing<0?'home-4':'home-2'))!;
  expect(near.x-spare.x).toBeGreaterThan(.25);
  expect(near.x-spare.x).toBeLessThan(1.5);
  expect(Math.abs(near.y-state.ball.y)).toBeLessThan(3);
  expect(Math.abs(near.y-spare.y)).toBeGreaterThanOrEqual(6);
  expect(spare.y*wing).toBeLessThan(0);
  expect(Math.abs(spare.y)).toBeLessThan(Math.abs(near.y));
  expect(targets.filter(t=>t.action==='press')).toHaveLength(0);
 });
 it.each(['loose','opponent-half'] as const)('keeps staggered support while another role presses a %s ball',mode=>{
  const state=shape('home',1);state.ball.x=4;
  if(mode==='loose')state.ball.ownerId=null;
  else {state.ball.ownerId='away-0';Object.assign(state.players.find(p=>p.id==='away-0')!,{x:4,y:6});}
  const targets=planTeamMovement(state,'home'),def=targets.filter(t=>t.playerId==='home-2'||t.playerId==='home-4');
  expect(targets.filter(t=>t.action==='press')).toHaveLength(1);
  expect(def.filter(t=>t.action==='press')).toHaveLength(0);
  expect(def[1]!.x-def[0]!.x).toBeGreaterThan(.25);
  expect(def[1]!.x-def[0]!.x).toBeLessThan(1.5);
  expect(Math.abs(def[0]!.y-def[1]!.y)).toBeGreaterThanOrEqual(6);
 });
 it('chooses the actually nearest defender, rather than hardcoding a flank or roster index',()=>{
  const state=shape('home',1);state.players.find(p=>p.id==='home-2')!.x=-2;
  const targets=planTeamMovement(state,'home');expect(targets.find(t=>t.playerId==='home-2')!.x).toBeGreaterThan(targets.find(t=>t.playerId==='home-4')!.x);
 });
 it('is pure, mirrors teams, and scales independently with both field dimensions',()=>{
  const state=shape(),before=structuredClone(state),base=planTeamMovement(state,'home');expect(state).toEqual(before);expect(planTeamMovement(state,'home')).toEqual(base);
  const swap=(s:string)=>s.replace(/^(home|away)/,t=>t==='home'?'away':'home');
  const mirror=structuredClone(state);mirror.players=mirror.players.map(p=>({...p,id:swap(p.id),team:p.team==='home'?'away':'home',x:-p.x,vx:-p.vx}));mirror.ball={...mirror.ball,x:-mirror.ball.x,ownerId:swap(mirror.ball.ownerId!)};
  const mirrored=planTeamMovement(mirror,'away');for(const target of base){const actual=mirrored.find(t=>t.playerId===swap(target.playerId))!;expect(actual.x).toBeCloseTo(-target.x);expect(actual.y).toBeCloseTo(target.y);expect(actual.action).toBe(target.action);}
  const scaled=structuredClone(state);scaled.tuning={...DEFAULT_TUNING,fieldWidth:48,fieldHeight:24};for(const p of [...scaled.players,scaled.ball]){p.x*=1.5;p.y*=1.2;}
  for(const t of planTeamMovement(scaled,'home')){const original=base.find(a=>a.playerId===t.playerId)!;expect(t.x).toBeCloseTo(original.x*1.5);expect(t.y).toBeCloseTo(original.y*1.2);}
 });
 it('does not write plans for either human defender, or invent a second DEF in 1-2-1',()=>{
  const state=shape();state.controls=[{seatId:'p1',team:'home',playerId:'home-2'},{seatId:'p2',team:'home',playerId:'home-4'}];expect(planTeamMovement(state,'home').map(t=>t.playerId)).not.toContain('home-2');expect(planTeamMovement(state,'home').map(t=>t.playerId)).not.toContain('home-4');
  const single=createGame({formations:{home:'1-2-1',away:'1-2-1'}});single.controls=[];single.controlledId='none';single.phase='playing';
  expect(single.players.filter(p=>p.team==='home'&&p.tacticalRole==='defender')).toHaveLength(1);expect(planTeamMovement(single,'home').map(t=>t.playerId)).not.toContain('home-3');
 });
 it('preserves the carrying defender and secure keeper safeguards',()=>{
  const state=shape();state.ball.ownerId='home-2';Object.assign(state.ball,{x:-10,y:-4.5});
  expect(planTeamMovement(state,'home').find(t=>t.playerId==='home-2')!.action).toBe('carry');
  state.ball.ownerId='away-3';expect(planTeamMovement(state,'home').some(t=>t.action==='press')).toBe(false);
 });
 it.each(['home','away'] as const)('maintains the %s line width and modest offset through actual engine ticks',team=>{
  const state=shape(team,-1),enemy=team==='home'?'away':'home';state.controls=[{seatId:'p1',team,playerId:`${team}-0`},{seatId:'p2',team:enemy,playerId:`${enemy}-0`}];
  for(let i=0;i<60;i++)stepLocalGame(state,{},1/60);
  const near=state.players.find(p=>p.id===`${team}-2`)!,spare=state.players.find(p=>p.id===`${team}-4`)!,sign=team==='home'?1:-1;
  expect(state.phase).toBe('playing');expect(state.ball.ownerId).toBe(`${team}-0`);
  expect((near.x-spare.x)*sign).toBeGreaterThan(.25);expect((near.x-spare.x)*sign).toBeLessThan(1.5);
  expect(Math.abs(near.y-spare.y)).toBeGreaterThanOrEqual(6);
  expect(Math.abs(spare.y)).toBeLessThan(Math.abs(near.y));expect(state.score).toEqual({home:0,away:0});
 });
});
