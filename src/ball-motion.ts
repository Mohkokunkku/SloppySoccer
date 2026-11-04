import {FIELD} from '../shared/types';
export interface BallMotion {px:number;py:number;x:number;z:number;phase:string}
/** Track actual planar displacement; rebase discontinuities without losing orientation. */
export function advanceBallMotion(previous:BallMotion|undefined,x:number,y:number,phase:string,paused:boolean,reduced=false,rebase=false):BallMotion {
 const dx=x-(previous?.px??x),dy=y-(previous?.py??y);
 const roll=!!previous&&!rebase&&!paused&&!reduced&&phase==='playing'&&previous.phase==='playing'&&Math.hypot(dx,dy)<=2;
 return {px:x,py:y,x:(previous?.x??0)+(roll?dy/FIELD.ballRadius:0),z:(previous?.z??0)-(roll?dx/FIELD.ballRadius:0),phase};
}
