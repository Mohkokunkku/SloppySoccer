import {it,expect} from 'vitest';
import {celebrationPose,celebrationStyle} from './celebrations';
it('rotates through three distinct team dances',()=>{
 expect([1,2,3,4].map(celebrationStyle)).toEqual([0,1,2,0]);
 const poses=[0,1,2].map(style=>JSON.stringify(celebrationPose(style,0.6,0,false)));
 expect(new Set(poses).size).toBe(3);
});
it('keeps all dance transforms finite and bounded for all players throughout five seconds',()=>{
 for(let t=0;t<=5;t+=0.1)for(let style=0;style<3;style++)for(let i=0;i<4;i++){
  const pose=celebrationPose(style,t,i,false);
  expect(Object.values(pose).every(Number.isFinite)).toBe(true);
  expect(pose.hop).toBeGreaterThanOrEqual(0);expect(pose.hop).toBeLessThanOrEqual(0.65);
  expect(Math.abs(pose.side)).toBeLessThanOrEqual(0.3);
 }
});
it('keeps a static raised-arms cheer when reduced motion is requested',()=>{
 expect(celebrationPose(0,0.1,0,true)).toEqual(celebrationPose(2,4,3,true));
 expect(celebrationPose(1,1,0,true).hop).toBe(0);
});
