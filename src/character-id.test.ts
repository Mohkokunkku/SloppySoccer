import {it,expect} from 'vitest';
import {characterIdFor} from './character-id';
it.each([['attacker','A1'],['midfielder','A3'],['defender','A2']] as const)('assigns the home %s to %s',(role,id)=>expect(characterIdFor('home','outfield',role)).toBe(id));
it.each(['attacker','midfielder','defender',undefined] as const)('does not replace Argentina or goalkeeper figures for %s',role=>{
 expect(characterIdFor('away','outfield',role)).toBeNull();expect(characterIdFor('home','keeper',role)).toBeNull();
});
it('leaves legacy figures with no tactical identity unchanged',()=>expect(characterIdFor('home','outfield',undefined)).toBeNull());
