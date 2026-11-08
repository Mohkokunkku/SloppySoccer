export const DANCE_NAMES = ['Boot bounce','Windmill wave','Toy shuffle','Victory orbit','Heel-toe slide'] as const;
export function celebrationStyle(totalGoals: number): number { return Math.max(0,Math.floor(totalGoals)-1)%5; }
export function celebrationPose(style: number, seconds: number, index: number, reducedMotion: boolean) {
  if(reducedMotion)return {hop:0,side:0,forward:0,yaw:0,roll:0,leftArm:-2.5,rightArm:2.5,leftLeg:0,rightLeg:0};
  // Absolute bounded samples: callers can freeze time or replay without accumulated drift.
  const t=Math.max(0,seconds),offset=index*.35,phase=t*7+offset;
  if(style===0)return {hop:Math.abs(Math.sin(t*5+offset))*.5,side:Math.sin(t*3+offset)*.22,forward:Math.sin(t*5+offset)*.3,yaw:Math.sin(t*3+offset)*.18,roll:0,leftArm:-2.7+Math.sin(phase)*.15,rightArm:2.7-Math.sin(phase)*.15,leftLeg:Math.sin(phase)*.25,rightLeg:-Math.sin(phase)*.25};
  if(style===1)return {hop:Math.abs(Math.sin(t*4+offset))*.15,side:Math.sin(t*2+offset)*.28,forward:Math.sin(t*4+offset)*.35,yaw:Math.sin(t*3+offset)*.7,roll:Math.sin(phase)*.09,leftArm:-1.7-Math.sin(phase)*.9,rightArm:1.7+Math.cos(phase)*.9,leftLeg:Math.sin(phase)*.3,rightLeg:-Math.sin(phase)*.3};
  if(style===2)return {hop:Math.abs(Math.sin(phase))*.12,side:Math.sin(t*6+offset)*.25,forward:Math.cos(t*3+offset)*.25,yaw:Math.sin(phase)*.22,roll:Math.sin(phase)*.2,leftArm:-2.3,rightArm:1.2+Math.sin(phase)*.7,leftLeg:Math.sin(phase)*.65,rightLeg:-Math.sin(phase)*.65};
  if(style===3)return {hop:Math.abs(Math.sin(phase))*.18,side:Math.sin(t*2.5+offset)*.3,forward:Math.cos(t*2.5+offset)*.45,yaw:Math.sin(t*2.5+offset)*.8,roll:Math.sin(phase)*.1,leftArm:-2+Math.sin(phase)*.6,rightArm:2+Math.cos(phase)*.6,leftLeg:Math.sin(phase)*.5,rightLeg:-Math.sin(phase)*.5};
  return {hop:Math.abs(Math.sin(phase))*.06,side:Math.sin(t*3+offset)*.3,forward:Math.sin(t*6+offset)*.4,yaw:Math.sin(phase)*.45,roll:Math.cos(phase)*.12,leftArm:-1.3+Math.sin(phase)*.5,rightArm:1.3-Math.sin(phase)*.5,leftLeg:Math.sin(phase)*.7,rightLeg:Math.cos(phase)*.5};
}
