import {expect,it} from 'vitest';
import {advanceBallMotion} from './ball-motion';
it('rolls from actual displacement only and suppresses paused, stationary and reset motion',()=>{
 const a=advanceBallMotion(undefined,0,0,'playing',false);
 const b=advanceBallMotion(a,.28,0,'playing',false);expect(b.z).toBeCloseTo(-1);
 expect(advanceBallMotion(b,.28,0,'playing',false).z).toBe(b.z);
 expect(advanceBallMotion(b,1,0,'playing',true).z).toBe(b.z);
 for(const phase of ['ready','goal','finished','resetting'])expect(advanceBallMotion(b,1,0,phase,false).z).toBe(b.z);
 expect(advanceBallMotion(b,20,0,'playing',false).z).toBe(b.z);
 const reset=advanceBallMotion(b,0,0,'ready',false);expect(advanceBallMotion(reset,0,0,'playing',false).z).toBe(reset.z);
});
it('rebases geometry and match discontinuities without losing orientation or rolling',()=>{
 const initial=advanceBallMotion(undefined,0,0,'playing',false);
 const rolled=advanceBallMotion(initial,.28,.14,'playing',false);
 const rebased=advanceBallMotion(rolled,.56,.28,'playing',false,false,true);
 expect(rebased.x).toBe(rolled.x);expect(rebased.z).toBe(rolled.z);
 const stationary=advanceBallMotion(rebased,.56,.28,'playing',false);
 expect(stationary).toEqual(rebased);
 const moving=advanceBallMotion(stationary,.84,.42,'playing',false);
 expect(moving.x).toBeCloseTo(rolled.x+.5);expect(moving.z).toBeCloseTo(rolled.z-1);
});
