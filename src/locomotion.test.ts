import {expect,it} from 'vitest';
import {advanceLocomotion} from './locomotion';
import {createFigure,poseFigure} from './scene';
it('keeps the standalone pose API compatible while honoring reduced motion',()=>{
 const player={id:'test',team:'home' as const,role:'outfield' as const,x:5,y:-3,vx:4,vy:0,facing:0,stamina:1};
 const rig=createFigure(player,0);poseFigure(rig,player,.1,false);expect(Math.abs(rig.legs[0].rotation.x)).toBeGreaterThan(0);
 poseFigure(rig,player,.1,true);expect(rig.legs[0].rotation.x).toBe(0);
});
it('uses distance, blends acceleration and freezes when paused',()=>{
 const a=advanceLocomotion(undefined,0,0,0,false,false);
 const b=advanceLocomotion(a,.4,0,.1,false,false);
 expect(b.phase).toBeGreaterThan(0);expect(b.blend).toBeGreaterThan(0);
 expect(advanceLocomotion(b,5,0,.1,true,false)).toEqual(b);
 const c=advanceLocomotion(b,.4,0,.1,false,true);expect(c.wave).toBe(0);expect(c.bob).toBe(0);
});
it('stationary frames do not advance stride and teleports reset the baseline',()=>{
 const a=advanceLocomotion(undefined,0,0,.1,false,false);
 const b=advanceLocomotion(a,0,0,.1,false,false);expect(b.phase).toBe(a.phase);
 expect(advanceLocomotion(b,20,0,.1,false,false).phase).toBe(b.phase);
});
