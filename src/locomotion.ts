export interface Locomotion {x:number;y:number;phase:number;blend:number;wave:number;bob:number;lean:number}
/** Per-rig presentation state; never changes simulation positions or velocities. */
export function advanceLocomotion(previous:Locomotion|undefined,x:number,y:number,dt:number,paused:boolean,reduced:boolean):Locomotion {
 if(previous&&paused)return previous;
 const distance=previous?Math.hypot(x-previous.x,y-previous.y):0;
 const safeDt=Math.max(0,Math.min(.1,dt));
 const travel=distance<=Math.max(1,safeDt*20)?distance:0;
 const speed=safeDt>0?travel/safeDt:0;
 const blend=(previous?.blend??0)+(Math.min(1,speed/5.6)-(previous?.blend??0))*(1-Math.exp(-safeDt*12));
 const phase=(previous?.phase??0)+travel*Math.PI*2/2.6;
 const wave=reduced?0:Math.sin(phase)*blend;
 return {x,y,phase,blend,wave,bob:reduced?0:Math.abs(Math.sin(phase))*blend*.07,lean:reduced?0:blend*.12};
}
