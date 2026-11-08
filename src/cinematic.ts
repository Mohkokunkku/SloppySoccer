export interface IntroSubject {x:number;y:number;z:number;yaw:number;faceHeight:number}
/** Stateless: countdown is engine-owned, so pause/skip/new-match cannot drift. */
export function introCamera(timer:number,subject:IntroSubject,wide:{width:number;height:number},reducedMotion:boolean){
 const width=Number.isFinite(wide.width)&&wide.width>0?wide.width:48;
 const height=Number.isFinite(wide.height)&&wide.height>0?wide.height:30;
 const remaining=Number.isFinite(timer)?Math.max(0,Math.min(6.5,timer)):0;
 const t=reducedMotion?1:Math.max(0,Math.min(1,(2.5-remaining)/2.5));
 const blend=t*t*(3-2*t),mix=(a:number,b:number)=>a+(b-a)*blend;
 const face=subject.y+subject.faceHeight;
 // Stay in the front hemisphere, but off the opposing kickoff player's axis.
 const viewYaw=subject.yaw+.45;
 return {mode:blend===1?'wide':remaining<=2.5?'intro-pullback':'intro',
  width:mix(4.8*width/height,width),height:mix(4.8,height),
  position:{x:mix(subject.x+Math.sin(viewYaw)*7,3),y:mix(face+.8,34),z:mix(subject.z+Math.cos(viewYaw)*7,29)},
  target:{x:mix(subject.x,0),y:mix(face,-.2),z:mix(subject.z,0)}};
}
