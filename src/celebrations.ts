export const DANCE_NAMES = ['Boot bounce','Windmill wave','Toy shuffle'] as const;
export function celebrationStyle(totalGoals: number): number { return Math.max(0,Math.floor(totalGoals)-1)%3; }
export function celebrationPose(style: number, seconds: number, index: number, reducedMotion: boolean) {
  if(reducedMotion)return {hop:0,side:0,yaw:0,roll:0,leftArm:-2.5,rightArm:2.5,leftLeg:0,rightLeg:0};
  const t=Math.max(0,Math.min(5,seconds)); const phase=t*7+index*0.35;
  if(style===0)return {hop:Math.abs(Math.sin(t*5))*0.5,side:0,yaw:Math.sin(t*3)*0.18,roll:0,leftArm:-2.7,rightArm:2.7,leftLeg:0.15,rightLeg:-0.15};
  if(style===1)return {hop:Math.abs(Math.sin(t*4))*0.15,side:0,yaw:Math.sin(t*3)*0.7,roll:Math.sin(phase)*0.09,leftArm:-1.7-Math.sin(phase)*0.9,rightArm:1.7+Math.cos(phase)*0.9,leftLeg:Math.sin(phase)*0.3,rightLeg:-Math.sin(phase)*0.3};
  return {hop:Math.abs(Math.sin(phase))*0.12,side:Math.sin(t*6)*0.25,yaw:Math.sin(phase)*0.22,roll:Math.sin(phase)*0.2,leftArm:-2.3,rightArm:1.2+Math.sin(phase)*0.7,leftLeg:Math.sin(phase)*0.65,rightLeg:-Math.sin(phase)*0.65};
}
