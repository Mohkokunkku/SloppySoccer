import {expect,it} from 'vitest';
import {createGame,kickoffPosition,startGame,stepGame} from './engine.js';
import {applyTuning,getTuning} from './tuning.js';
import {EMPTY_INPUT} from './types.js';
it('enters from central queues at bounded speed with frozen clocks and consumed edges',()=>{
 const s=createGame();startGame(s,true);expect(s.phase).toBe('entering');
 s.players.forEach(p=>{expect(Math.abs(p.x)).toBe(2);expect(p.y).toBeGreaterThan(10);});
 const held={...EMPTY_INPUT,shoot:true,pass:true,switchPlayer:true};let frames=0;
 while(s.phase==='entering'&&frames<1000){const before=s.players.map(p=>({x:p.x,y:p.y}));if(frames===30)applyTuning(s,{fieldWidth:40,fieldHeight:24});stepGame(s,held,1/60);frames++;
 s.players.forEach((p,i)=>expect(Math.hypot(p.x-before[i]!.x,p.y-before[i]!.y)).toBeLessThanOrEqual(7/60+1e-9));expect(s.elapsed).toBe(0);expect(s.timeRemaining).toBe(120);
 if(s.phase==='entering')expect(s.ball).toEqual({x:0,y:0,vx:0,vy:0,z:0,vz:0,ownerId:null});}
 expect(s.phase).toBe('playing');s.players.forEach(p=>{const t=kickoffPosition(p.team,Number(p.id.slice(-1)),'home',getTuning(s));expect(p.x).toBeCloseTo(t.x);expect(p.y).toBeCloseTo(t.y);expect(p.vx).toBe(0);});
 stepGame(s,held,1/60);expect(s.ball.ownerId).toBe('home-0');expect(s.controlledId).toBe('home-0');
});
