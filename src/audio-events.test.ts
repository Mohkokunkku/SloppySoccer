import {it,expect} from 'vitest';
import {createGame,startGame} from '../shared/engine';
import {AudioEvents} from './audio-events';
import {DEFAULT_TUNING} from '../shared/tuning';
it('reacts to on-target shots with a two-second cooldown, not passes or keeper clearances',()=>{
 const s=createGame();startGame(s);const p=new AudioEvents();
 const owner=s.players.find(v=>v.team==='home'&&v.role==='outfield')!;
 const release=(speed:number)=>{s.ball.ownerId=owner.id;p.tick(s);s.ball.ownerId=null;s.ball.x=0;s.ball.y=0;s.ball.vx=speed;s.ball.vy=0;return p.tick(s);};
 expect(release(15)).not.toContain('crowd-shot');
 expect(release(22)).toContain('crowd-shot');expect(release(22)).not.toContain('crowd-shot');
 s.elapsed=2;expect(release(22)).toContain('crowd-shot');
 s.elapsed=4;s.ball.ownerId=s.players.find(v=>v.role==='keeper')!.id;p.tick(s);s.ball.ownerId=null;expect(p.tick(s)).not.toContain('crowd-shot');
});
it('uses tuned shot speed and goal geometry for both teams, rejecting off-target trajectories',()=>{
 const s=createGame();startGame(s);s.tuning={...DEFAULT_TUNING,fieldWidth:48,goalWidth:3,kickPower:12,passPower:24};const p=new AudioEvents();
 const owner=s.players.find(v=>v.team==='away'&&v.role==='outfield')!;
 s.ball.ownerId=owner.id;p.tick(s);s.ball.ownerId=null;s.ball.x=0;s.ball.y=0;s.ball.vx=-12;s.ball.vy=3;expect(p.tick(s)).not.toContain('crowd-shot');
 s.ball.ownerId=owner.id;p.tick(s);s.ball.ownerId=null;s.ball.vy=0;expect(p.tick(s)).toContain('crowd-shot');
});
it('emits one kick for a real possession release and no duplicate on later frames',()=>{
 const s=createGame();startGame(s); const policy=new AudioEvents();policy.tick(s);
 s.ball.ownerId=null;s.ball.vx=15;expect(policy.tick(s)).toContain('kick');expect(policy.tick(s)).not.toContain('kick');
});
it('emits one goal per score change, including a final-tick goal',()=>{
 const s=createGame();const p=new AudioEvents();p.tick(s);s.score.home=1;s.phase='goal';
 expect(p.tick(s)).toEqual(['goal']);expect(p.tick(s)).toEqual([]);
 s.phase='finished';s.score.home=2;expect(p.tick(s)).toEqual(['goal']);
});
it('calls for an open supporting teammate with an eight-second cooldown',()=>{
 const s=createGame();startGame(s);for(const p of s.players.filter(p=>p.team==='away')){p.x=14;p.y=9;}
 const policy=new AudioEvents();policy.tick(s);s.elapsed=3;
 expect(policy.tick(s)).toEqual(['pass-me']);s.elapsed=4;expect(policy.tick(s)).toEqual([]);
 s.elapsed=12;expect(policy.tick(s)).toEqual(['here']);
});
it('does not chatter while paused/resetting, on enemy possession or with marked teammates',()=>{
 const s=createGame();startGame(s);const policy=new AudioEvents();policy.tick(s);s.elapsed=3;s.phase='resetting';expect(policy.tick(s)).toEqual([]);
 s.phase='playing';s.ball.ownerId='away-0';expect(policy.tick(s)).toEqual([]);
});
