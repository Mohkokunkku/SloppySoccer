import {expect,it} from 'vitest';
import {createGame,startGame,stepGame} from './engine.js';
import {EMPTY_INPUT} from './types.js';
it('bounds acceleration, braking and shortest-angle turning with live tuning',()=>{
 const s=createGame();startGame(s);s.tuning={fieldWidth:32,fieldHeight:20,goalWidth:7,goalHeight:2.8,runSpeed:6,sprintMultiplier:1.5,kickPower:22,passPower:15,keeperPower:13.8,acceleration:8,turnRate:2};
 const p=s.players[0]!;p.facing=Math.PI-.01;
 stepGame(s,{...EMPTY_INPUT,moveX:-1,moveY:-.01},.1);
 expect(Math.hypot(p.vx,p.vy)).toBeCloseTo(.8);expect(Math.abs(p.facing-(Math.PI-.01))).toBeLessThanOrEqual(.2);
 const v={x:p.vx,y:p.vy};stepGame(s,EMPTY_INPUT,.05);expect(Math.hypot(p.vx-v.x,p.vy-v.y)).toBeLessThanOrEqual(.400000001);
});
