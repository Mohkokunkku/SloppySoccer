import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {DANCE_NAMES,celebrationPose,celebrationStyle} from './celebrations';
it('rotates through five distinct team dances with stable original names',()=>{
 expect(DANCE_NAMES).toEqual(['Boot bounce','Windmill wave','Toy shuffle','Victory orbit','Heel-toe slide']);
 expect([1,2,3,4,5,6].map(celebrationStyle)).toEqual([0,1,2,3,4,0]);
 const poses=[0,1,2,3,4].map(style=>JSON.stringify(celebrationPose(style,0.6,0,false)));
 expect(new Set(poses).size).toBe(5);
});
it('keeps all dance transforms finite and bounded for all players throughout five seconds',()=>{
 for(let t=0;t<=6.5;t+=0.1)for(let style=0;style<5;style++)for(let i=0;i<5;i++){
  const pose=celebrationPose(style,t,i,false);
  expect(Object.values(pose).every(Number.isFinite)).toBe(true);
  expect(pose.hop).toBeGreaterThanOrEqual(0);expect(pose.hop).toBeLessThanOrEqual(0.65);
  expect(Math.abs(pose.side)).toBeLessThanOrEqual(0.3);
  expect(Math.abs(pose.forward)).toBeLessThanOrEqual(0.5);
 }
});
it('keeps a static raised-arms cheer when reduced motion is requested',()=>{
 expect(celebrationPose(0,0.1,0,true)).toEqual(celebrationPose(2,4,3,true));
 expect(celebrationPose(1,1,0,true).hop).toBe(0);
});
it('exposes five stable demo buttons and selected dance diagnostics',()=>{
 const html=readFileSync(new URL('../celebrations.html',import.meta.url),'utf8');
 for(const [index,name] of DANCE_NAMES.entries())expect(html).toContain(`data-dance="${index}" type="button">${name}</button>`);
 const demo=readFileSync(new URL('./celebration-demo.ts',import.meta.url),'utf8');
 expect(demo).toContain('status.dataset.danceStyle=String(style)');
 expect(demo).toContain('status.dataset.danceName=DANCE_NAMES[style]');
});
