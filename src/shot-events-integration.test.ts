import {it,expect} from 'vitest';
import {createGame,startGame,stepGame} from '../shared/engine';
import {EMPTY_INPUT} from '../shared/types';
import {applyTuning} from '../shared/tuning';
import {AudioEvents} from './audio-events';
it('identifies actual shots even when live shot and pass powers match',()=>{
 const s=createGame();applyTuning(s,{kickPower:22,passPower:22});startGame(s);const policy=new AudioEvents();policy.tick(s);stepGame(s,{...EMPTY_INPUT,shoot:true,moveX:1},1/60);const events=policy.tick(s);expect(events).toContain('kick');expect(events).toContain('crowd-shot');
});
it('does not mistake a same-power actual pass for a shot',()=>{
 const s=createGame();applyTuning(s,{kickPower:22,passPower:22});startGame(s);const policy=new AudioEvents();policy.tick(s);stepGame(s,{...EMPTY_INPUT,pass:true,moveX:1},1/60);expect(policy.tick(s)).not.toContain('crowd-shot');
});
