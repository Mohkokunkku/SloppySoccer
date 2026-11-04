import {expect,it} from 'vitest';
import {createGame,startGame,stepGame,kickoffPosition} from './engine.js';
import {applyTuning,getTuning} from './tuning.js';
import {EMPTY_INPUT} from './types.js';
import {planTeamMovement} from './tactics.js';
it('uses live geometry for kickoff, tactical targets, walls and scoring height',()=>{
 const s=createGame();applyTuning(s,{fieldWidth:20,fieldHeight:12,goalWidth:4,goalHeight:1.5});startGame(s);
 expect(kickoffPosition('home',2,'home',getTuning(s))).toEqual({x:-6.25,y:3});
 for(const t of planTeamMovement(s,'away')){expect(Math.abs(t.x)).toBeLessThanOrEqual(9.38);expect(Math.abs(t.y)).toBeLessThanOrEqual(5.38);}
 s.players.forEach(p=>{p.x=-7;p.y=5;});Object.assign(s.ball,{ownerId:null,x:9.7,y:0,z:2,vz:0,vx:20,vy:0});stepGame(s,EMPTY_INPUT,.05);expect(s.ball.vx).toBeLessThan(0);expect(s.score.home).toBe(0);
 Object.assign(s.ball,{ownerId:null,x:10.4,y:0,z:0,vz:0,vx:1,vy:0});stepGame(s,EMPTY_INPUT,.01);expect(s.score.home).toBe(1);
});
it('uses live shot and pass power',()=>{
 for(const action of ['shoot','pass'] as const){const s=createGame();applyTuning(s,{kickPower:30,passPower:20});startGame(s);stepGame(s,{...EMPTY_INPUT,[action]:true},.01);expect(Math.hypot(s.ball.vx,s.ball.vy)).toBeCloseTo((action==='shoot'?30:20)*Math.exp(-.35*.01));}
});
it('preserves elevated protected keeper clearances with live power',()=>{
 for(const team of ['home','away'] as const){const s=createGame();applyTuning(s,{fieldWidth:40,keeperPower:18});startGame(s);s.elapsed=1;
 const sign=team==='home'?1:-1,keeper=s.players.find(p=>p.id===`${team}-3`)!;
 keeper.x=-sign*18.25;keeper.y=0;
 const attacker=s.players.find(p=>p.team!==team&&p.id!==s.controlledId)!;attacker.x=keeper.x+sign*1.15;attacker.y=0;
 s.ball.ownerId=keeper.id;stepGame(s,EMPTY_INPUT,1/60);
 expect(s.ball.ownerId).toBeNull();expect(s.ball.z).toBeGreaterThan(1.1);expect(s.ball.vx*sign).toBeGreaterThan(17);expect(s.ball.vx*sign).toBeLessThan(18);
 }
});
it('resets onto live kickoff targets without advancing clocks or recounting a goal',()=>{
 const s=createGame();applyTuning(s,{fieldWidth:40,fieldHeight:24});startGame(s);
 s.players.forEach(p=>{p.x=-15;p.y=9;});Object.assign(s.ball,{ownerId:null,x:20.4,y:0,z:0,vz:0,vx:1,vy:0});
 stepGame(s,EMPTY_INPUT,.01);expect(s.phase).toBe('goal');const time=s.timeRemaining,elapsed=s.elapsed;
 for(let i=0;i<1000&&s.phase!=='playing';i++)stepGame(s,EMPTY_INPUT,.1);
 expect(s.phase).toBe('playing');expect(s.timeRemaining).toBe(time);expect(s.elapsed).toBe(elapsed);expect(s.score.home).toBe(1);expect(s.ball.ownerId).toBe('away-0');
 s.players.forEach(p=>{const t=kickoffPosition(p.team,Number(p.id.slice(-1)),'away',getTuning(s));expect(p.x).toBeCloseTo(t.x);expect(p.y).toBeCloseTo(t.y);});
});
