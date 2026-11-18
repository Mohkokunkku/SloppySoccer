import {describe,expect,it} from 'vitest';
import {createGame,stepLocalGame} from './engine';
import {planTeamMovement} from './tactics';
import {DEFAULT_TUNING} from './tuning';
import type {GameState,Team} from './types';
function scene(team:Team='home',wing=1,threat=false):GameState{
 const s=createGame();s.phase='playing';s.controls=[];s.controlledId='none';s.tuning={...DEFAULT_TUNING,fieldWidth:32,fieldHeight:20};
 const sign=team==='home'?1:-1,enemy=team==='home'?'away':'home';
 const put=(id:string,x:number,y:number)=>Object.assign(s.players.find(p=>p.id===id)!,{x:x*sign,y,vx:0,vy:0});
 put(`${team}-0`,threat?7:1,threat?-7:wing*6);put(`${team}-1`,3,-5);put(`${team}-2`,-9,-4.5);put(`${team}-4`,-9,4.5);
 put(`${enemy}-0`,threat?-6:8,wing*5);put(`${enemy}-1`,9,-7);put(`${enemy}-2`,10,7);put(`${enemy}-4`,10,-7);
 const owner=threat?`${enemy}-0`:`${team}-0`;const p=s.players.find(p=>p.id===owner)!;Object.assign(s.ball,{ownerId:owner,x:p.x,y:p.y,vx:0,vy:0});return s;
}
describe('wide defensive line with a single forechecker',()=>{
 it.each([-1,0,1])('keeps width and a modest depth offset during possession on wing %s',wing=>{
  const s=scene('home',wing),d=planTeamMovement(s,'home').filter(t=>['home-2','home-4'].includes(t.playerId));
  expect(Math.abs(d[0]!.y-d[1]!.y)).toBeGreaterThanOrEqual(6);
  expect(Math.abs(d[0]!.x-d[1]!.x)).toBeLessThanOrEqual(1.5);
  if(wing!==0)expect(Math.abs(d[0]!.x-d[1]!.x)).toBeGreaterThan(.25);
  expect(d[0]!.y).toBeLessThan(0);expect(d[1]!.y).toBeGreaterThan(0);
 });
 it.each(['home','away'] as const)('holds the second %s defender well behind a wing forecheck',team=>{
  const s=scene(team,1,true),sign=team==='home'?1:-1;const d=planTeamMovement(s,team).filter(t=>[`${team}-2`,`${team}-4`].includes(t.playerId));
  const press=d.find(t=>t.action==='press')!,cover=d.find(t=>t.action==='cover')!;expect(press).toBeDefined();expect(cover).toBeDefined();
  expect((press.x-cover.x)*sign).toBeGreaterThanOrEqual(4);
  expect(Math.hypot(cover.x-s.ball.x,cover.y-s.ball.y)).toBeGreaterThanOrEqual(4);
 });
 it('keeps both defenders spread behind the play when midfield is already pressing',()=>{
  const s=scene('home',1,true),carrier=s.players.find(p=>p.id==='away-0')!;Object.assign(s.players.find(p=>p.id==='home-1')!,{x:carrier.x-.1,y:carrier.y});
  const targets=planTeamMovement(s,'home'),d=targets.filter(t=>['home-2','home-4'].includes(t.playerId));
  expect(targets.find(t=>t.action==='press')!.playerId).toBe('home-1');expect(d.every(t=>t.action==='cover')).toBe(true);
  expect(Math.abs(d[0]!.y-d[1]!.y)).toBeGreaterThanOrEqual(5);
  expect(d.every(t=>Math.hypot(t.x-s.ball.x,t.y-s.ball.y)>=3.5)).toBe(true);
 });
 it('backs up a human defender who is already forechecking instead of sending the AI partner into the same tackle',()=>{
  const s=scene('home',1,true),human=s.players.find(p=>p.id==='home-4')!;Object.assign(human,{x:-6.7,y:5});s.controls=[{seatId:'p1',team:'home',playerId:human.id}];
  const before=structuredClone(s),targets=planTeamMovement(s,'home'),cover=targets.find(t=>t.playerId==='home-2')!;
  expect(targets.some(t=>t.action==='press')).toBe(false);expect(targets.some(t=>t.playerId===human.id)).toBe(false);
  expect(cover.action).toBe('cover');expect(cover.x).toBeLessThanOrEqual(-10);expect(s).toEqual(before);
 });
 it.each(['home','away'] as const)('actually sends the %s spare backwards while its partner closes down',team=>{
  const s=scene(team,1,true),enemy=team==='home'?'away':'home',sign=team==='home'?1:-1;s.controls=[{seatId:'p1',team:enemy,playerId:`${enemy}-0`}];
  const press=s.players.find(p=>p.id===`${team}-4`)!,cover=s.players.find(p=>p.id===`${team}-2`)!,px=press.x,cx=cover.x;
  for(let tick=0;tick<15;tick++)stepLocalGame(s,{},1/60);
  expect(s.ball.ownerId).toBe(`${enemy}-0`);expect((press.x-px)*sign).toBeGreaterThan(.4);
  expect((cover.x-cx)*sign).toBeLessThan(-.15);expect(s.score).toEqual({home:0,away:0});
 });
});
