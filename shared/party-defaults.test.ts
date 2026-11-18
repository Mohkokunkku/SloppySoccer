import {describe,it,expect} from 'vitest';
import {createGame} from './engine.js';
import {DEFAULT_TUNING,TUNING_LIMITS,sanitizeTuning,applyTuning} from './tuning.js';
import {formationPosition} from './formations.js';

describe('party defaults',()=>{
 it('uses the enlarged field while retaining canonical tactical coordinates and sprint tuning',()=>{
  expect(DEFAULT_TUNING.fieldWidth).toBe(35.2);
  expect(DEFAULT_TUNING.fieldHeight).toBe(22);
  expect(DEFAULT_TUNING.sprintMultiplier).toBe(1.15);
  expect(TUNING_LIMITS.fieldWidth.step).toBeLessThanOrEqual(.1);
  expect(formationPosition('home',0,false,DEFAULT_TUNING,'2-1-1').x).toBeLessThan(16);
 });
 it('sanitizes, resets, and safely applies enlarged geometry',()=>{
  expect(sanitizeTuning({fieldWidth:35.2,fieldHeight:22,sprintMultiplier:1.15})).toMatchObject({fieldWidth:35.2,fieldHeight:22,sprintMultiplier:1.15});
  const state=createGame();state.players[0]!.x=16.5;applyTuning(state,{fieldWidth:35.2,fieldHeight:22});
  expect(state.players[0]!.x).toBeLessThanOrEqual(17.0);
  expect(sanitizeTuning(null)).toEqual(DEFAULT_TUNING);
 });
});
