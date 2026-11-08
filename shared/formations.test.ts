import { describe, expect, it } from 'vitest';
import { DEFAULT_FORMATIONS, formationPosition, formationRole, sanitizeFormations } from './formations.js';
import { DEFAULT_TUNING } from './tuning.js';

describe('five-a-side formations', () => {
  it('sanitizes each team independently and returns independent defaults', () => {
    expect(DEFAULT_FORMATIONS).toEqual({home:'2-1-1',away:'2-1-1'});
    expect(sanitizeFormations({home:'1-2-1',away:'bad'})).toEqual({home:'1-2-1',away:'2-1-1'});
    const result = sanitizeFormations(null); result.home = '1-2-1';
    expect(sanitizeFormations(undefined)).toEqual(DEFAULT_FORMATIONS);
  });
  it.each(['2-1-1','1-2-1'] as const)('assigns four outfield roles and preserves keeper slot for %s', formation => {
    expect([0,1,2,3,4].map(slot => formationRole(slot, formation))).toEqual(
      ['attacker','midfielder','defender',null,formation === '2-1-1' ? 'defender' : 'midfielder']);
    expect(formationRole(-1,formation)).toBeNull();
    expect(formationRole(5,formation)).toBeNull();
  });
  it.each(['2-1-1','1-2-1'] as const)('scales, mirrors and separates kickoff lanes for %s', formation => {
    const expected = formation === '2-1-1' ? [[-1,0],[-5,0],[-10,-4.5],[-14.6,0],[-10,4.5]] : [[-1,0],[-5,-4.5],[-10,0],[-14.6,0],[-5,4.5]];
    for(let slot=0;slot<5;slot++) {
      const [x,y] = expected[slot]!;
      expect(formationPosition('home',slot,false,DEFAULT_TUNING,formation)).toEqual({x,y});
      expect(formationPosition('away',slot,false,{...DEFAULT_TUNING,fieldWidth:48,fieldHeight:30},formation)).toEqual({x:-x!*1.5,y:y!*1.5});
    }
    expect(formationPosition('home',0,true,DEFAULT_TUNING,formation)).toEqual({x:-3,y:0});
  });
});
