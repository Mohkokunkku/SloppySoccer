import {it,expect} from 'vitest';
import {createGame,startGame} from '../shared/engine';
import {AudioEvents} from './audio-events';
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
