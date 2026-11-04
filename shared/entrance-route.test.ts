import{it,expect}from'vitest';
import{createGame,startGame,stepGame}from'./engine';
import{EMPTY_INPUT}from'./types';
import{applyTuning,getTuning}from'./tuning.js';
import{kickoffPosition}from'./engine.js';
it('leaves dressing-room doorways straight ahead and eases into the run',()=>{
 const s=createGame();startGame(s,true);stepGame(s,EMPTY_INPUT,1/60);
 for(const p of s.players){expect(p.x).toBe(p.team==='home'?-2:2);expect(Math.hypot(p.vx,p.vy)).toBeLessThan(7);expect(p.vy).toBeLessThan(0);}
 for(let i=0;i<60;i++){stepGame(s,EMPTY_INPUT,1/60);for(const p of s.players)if(p.y>10.5+1e-8)expect(p.x).toBe(p.team==='home'?-2:2);}
});
it.each([0,20,60].flatMap(frame=>[12,30].map(height=>({frame,height}))))('keeps the original doorway route when height becomes $height at frame $frame',({frame,height})=>{
 const s=createGame();startGame(s,true);
 const held={...EMPTY_INPUT,shoot:true,pass:true,switchPlayer:true};
 const exited=new Set<string>();let frames=0;
 while(s.phase==='entering'&&frames<1000){
  const before=s.players.map(p=>({x:p.x,y:p.y}));
  if(frames===frame){applyTuning(s,{fieldHeight:height});s.players.forEach((p,i)=>{expect(p.x).toBe(before[i]!.x);expect(p.y).toBe(before[i]!.y);});}
  stepGame(s,held,1/60);frames++;
  s.players.forEach((p,i)=>{
   expect(Math.hypot(p.x-before[i]!.x,p.y-before[i]!.y)).toBeLessThanOrEqual(7/60+1e-9);
   if(!exited.has(p.id)){expect(p.x).toBe(p.team==='home'?-2:2);if(p.y<=10.5+1e-9)exited.add(p.id);}
  });
  expect(s.elapsed).toBe(0);expect(s.timeRemaining).toBe(120);expect(s.score).toEqual({home:0,away:0});
  if(s.phase==='entering'){expect(s.entrance?.fieldHeight).toBe(20);expect(s.entrance?.exitY).toBe(10.5);expect(new Set(s.entrance?.completed)).toEqual(exited);}
 }
 expect(exited.size).toBe(8);expect(s.phase).toBe('playing');expect(s.entrance).toBeUndefined();
 s.players.forEach(p=>{const target=kickoffPosition(p.team,Number(p.id.slice(-1)),'home',getTuning(s));expect(p.x).toBeCloseTo(target.x);expect(p.y).toBeCloseTo(target.y);});
 stepGame(s,held,1/60);expect(s.ball.ownerId).toBe('home-0');expect(s.controlledId).toBe('home-0');
});
it('anchors the entrance to tuning at start rather than default dimensions',()=>{
 const s=createGame();applyTuning(s,{fieldHeight:30});startGame(s,true);
 expect(s.entrance).toEqual({fieldHeight:30,exitY:15.5,completed:[]});
 expect(s.players[0]!.y).toBe(17);
});
