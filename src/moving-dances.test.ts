import {expect,it} from 'vitest';
import type {Player} from '../shared/types';
import {celebrationPose} from './celebrations';
import {createFigure,poseFigure} from './scene';

const player:Player={id:'home-0',team:'home',role:'outfield',x:3,y:-2,vx:0,vy:0,facing:.4,stamina:1};
for(let style=0;style<5;style++){
 it(`dance ${style} travels on both planar axes with individual phases`,()=>{
  const samples=[0,.25,.5,.75,1,1.5,2,3,4,5,6].map(t=>celebrationPose(style,t,0,false));
  expect(new Set(samples.map(p=>p.side.toFixed(4))).size).toBeGreaterThan(3);
  expect(new Set(samples.map(p=>p.forward.toFixed(4))).size).toBeGreaterThan(3);
  expect(celebrationPose(style,.6,0,false)).not.toEqual(celebrationPose(style,.6,1,false));
 });
 for(const mould of ['original','attacker','midfielder','defender','keeper'] as const){
  it(`dance ${style} moves ${mould} without drift or simulation mutation and restores neutral pose`,()=>{
   const p:Player={...player,role:mould==='keeper'?'keeper':'outfield',tacticalRole:mould==='original'||mould==='keeper'?undefined:mould};
   const before=structuredClone(p),rig=createFigure(p,0);
   const cheer={style,seconds:.6,index:2};
   poseFigure(rig,p,1,false,cheer);const position=rig.root.position.clone();
   expect(Math.hypot(position.x-p.x,position.z-p.y)).toBeGreaterThan(.01);
   poseFigure(rig,p,1,false,cheer);expect(rig.root.position.equals(position)).toBe(true);
   poseFigure(rig,p,2,true,cheer);expect(rig.root.position.toArray()).toEqual([p.x,.1,p.y]);
   expect(rig.root.rotation.y).toBeCloseTo(Math.PI/2-p.facing);
   poseFigure(rig,p,3,false);
   expect(rig.root.position.toArray()).toEqual([p.x,.1,p.y]);
   expect(rig.body.rotation.x).toBe(0);expect(rig.body.rotation.z).toBe(0);expect(rig.body.position.y).toBe(0);
   for(const limb of [...rig.legs,...rig.arms,...rig.knees??[],...rig.elbows??[]])expect(limb.rotation.x).toBeCloseTo(0);
   expect(rig.arms[0].rotation.z).toBeCloseTo(p.role==='keeper'?-.94:-.26);
   expect(p).toEqual(before);
  });
 }
}
it('reduced motion is static across every dance and time',()=>{
 for(let style=0;style<5;style++)for(const t of [0,1,5,6.5]){
  const pose=celebrationPose(style,t,4,true);
  expect([pose.side,pose.forward,pose.hop,pose.yaw,pose.roll]).toEqual([0,0,0,0,0]);
 }
});
