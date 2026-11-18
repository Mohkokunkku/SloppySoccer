import {expect,it} from 'vitest';
import {DEFAULT_TUNING,TUNING_LIMITS,getTuning,sanitizeTuning} from './tuning';
import {createGame,startGame,stepGame} from './engine';
import {EMPTY_INPUT} from './types';
import {tuningPanelMarkup} from '../src/tuning-panel';
it('defaults to exactly fifteen percent stronger passing with a representable slider value',()=>{
 expect(DEFAULT_TUNING.passPower).toBe(15*1.15);expect(DEFAULT_TUNING.passPower).toBe(17.25);
 expect(TUNING_LIMITS.passPower.step).toBe(.25);expect((DEFAULT_TUNING.passPower-TUNING_LIMITS.passPower.min)%TUNING_LIMITS.passPower.step).toBe(0);
 expect(sanitizeTuning({}).passPower).toBe(17.25);expect(getTuning(createGame()).passPower).toBe(17.25);
 expect(tuningPanelMarkup({...DEFAULT_TUNING})).toContain('value="17.25"');
});
it('uses the stronger default for actual passes while retaining shot and keeper power',()=>{
 const s=createGame();startGame(s);stepGame(s,{...EMPTY_INPUT,pass:true,moveX:0,moveY:1},.01);
 expect(Math.hypot(s.ball.vx,s.ball.vy)).toBeCloseTo(17.25*Math.exp(-.35*.01));expect(DEFAULT_TUNING.kickPower).toBe(22);expect(DEFAULT_TUNING.keeperPower).toBe(13.8);
});
