import {describe,expect,it} from 'vitest';
import {victoryMusic} from './victory-music';

describe('team victory music selection',()=>{
 it.each(['home','away'] as const)('selects the %s anthem regardless of visual theme',winner=>{
  const expected=winner==='home'?['victory-spain-pop','/audio-v5/spain-toy-pop.wav','Marcha Real · Toy Pop']:['victory-argentina-pop','/audio-v5/argentina-toy-pop.wav','Himno Nacional Argentino · Toy Pop'];
  for(const theme of [0,1,2] as const)expect(victoryMusic({winner,theme})).toEqual({id:expected[0],path:expected[1],title:expected[2]});
 });
 it.each([0,1,2] as const)('keeps draw theme %s neutral',theme=>expect(victoryMusic({winner:null,theme})).toEqual({id:`theme-${theme}`,path:`/audio-v3/theme-${theme}.wav`,title:['Golden Boot','The Grandstand','After the Whistle'][theme]}));
});