import {expect,it} from 'vitest';
import {DEFAULT_TUNING,TUNING_LIMITS,sanitizeTuning} from '../shared/tuning';
import {tuningPanelMarkup} from './tuning-panel';
import {LocalInputHub} from './local-input';
it('defaults to a faster 0.6-second shot charge and exposes its live tuning slider',()=>{
 expect(DEFAULT_TUNING.shotChargeTime).toBe(.6);
 expect(TUNING_LIMITS.shotChargeTime).toMatchObject({min:.2,max:2,step:.05,unit:'s'});
 expect(tuningPanelMarkup({...DEFAULT_TUNING})).toContain('id="tune-shotChargeTime"');
 expect(sanitizeTuning({shotChargeTime:0}).shotChargeTime).toBe(.2);
 expect(sanitizeTuning({shotChargeTime:Infinity}).shotChargeTime).toBe(.6);
});
it('uses configured charge time for the live meter and exact release power',()=>{
 let now=0;const hub=new LocalInputHub(()=>[],()=>now,()=>.3);hub.keyDown('Space');hub.poll();now=150;
 expect(hub.poll().inputs.p1.shotCharge).toBeCloseTo(.5);hub.keyUp('Space');expect(hub.poll().actionGroups.p1[0].shotCharge).toBeCloseTo(.5);
});
it('applies a changed charge time to the next shot without changing a held shot retroactively',()=>{
 let now=0,time=.6;const hub=new LocalInputHub(()=>[],()=>now,()=>time);hub.keyDown('Space');hub.poll();time=.2;now=300;
 expect(hub.poll().inputs.p1.shotCharge).toBeCloseTo(.5);hub.keyUp('Space');hub.poll();hub.keyDown('Space');hub.poll();now=400;
 expect(hub.poll().inputs.p1.shotCharge).toBeCloseTo(.5);
});
