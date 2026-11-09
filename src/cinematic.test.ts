import {expect,it} from 'vitest';
import {introCamera} from './cinematic';
const subject={x:3,y:0.2,z:-4,yaw:Math.PI/2,faceHeight:2.1};
const wide={width:48,height:30};
it('views the front face at a modest three-quarter angle instead of along kickoff rows',()=>{
 for(const yaw of [Math.PI/2,-Math.PI/2,0]){
  const s={...subject,yaw},camera=introCamera(6.5,s,wide,false);
  const dx=camera.position.x-s.x,dz=camera.position.z-s.z;
  const forward=dx*Math.sin(yaw)+dz*Math.cos(yaw),lateral=dx*Math.cos(yaw)-dz*Math.sin(yaw);
  expect(forward).toBeGreaterThan(5);expect(Math.abs(lateral)).toBeGreaterThan(2.5);
  expect(Math.abs(lateral/forward)).toBeLessThan(.7);
 }
});
it('frames the actual face from its forward direction, then continuously pulls wide',()=>{
 const close=introCamera(6.5,subject,wide,false);
 expect(close.mode).toBe('intro');expect(close.position.x).toBeGreaterThan(subject.x);expect(close.target.y).toBeCloseTo(2.3);
 const end=introCamera(0,subject,wide,false);expect(end.mode).toBe('wide');expect(end.position).toEqual({x:3,y:34,z:29});expect(end.height).toBe(30);
 const a=introCamera(1,subject,wide,false),b=introCamera(.999,subject,wide,false);expect(Math.abs(a.height-b.height)).toBeLessThan(.1);
});
it('uses static wide reduced motion and finite dimensions',()=>{
 expect(introCamera(6.5,subject,wide,true).mode).toBe('wide');
 const camera=introCamera(Number.NaN,subject,{width:Infinity,height:0},false);
 expect(Object.values(camera.position).every(Number.isFinite)).toBe(true);expect(Number.isFinite(camera.width)).toBe(true);expect(camera.height).toBeGreaterThan(0);
});
