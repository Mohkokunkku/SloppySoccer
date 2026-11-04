import type {GameState,Player} from '../shared/types';
import {getTuning} from '../shared/tuning';
export type SoundEvent = 'kick' | 'goal' | 'pass-me' | 'here' | 'crowd-shot';
function laneDistance(p:Player,a:Player,b:Player){const dx=b.x-a.x,dy=b.y-a.y;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
export class AudioEvents {
 private previous: {owner:string|null;score:number;phase:GameState['phase'];release:number}|null=null;
 private nextCall=2; private call=0;private nextShot=0;
 reset():void{this.previous=null;this.nextCall=2;this.call=0;this.nextShot=0;}
 tick(state:GameState):SoundEvent[]{
  const score=state.score.home+state.score.away;
  const now={owner:state.ball.ownerId,score,phase:state.phase,release:state.ball.release?.id??0}; const before=this.previous;this.previous=now;
  if(!before)return [];
  if(score>before.score)return ['goal'];
  if(state.phase!=='playing')return [];
  const events:SoundEvent[]=[];
  const release=state.ball.release;
  const taggedRelease=!!release&&release.id!==before.release;
  const legacyRelease=!release&&before.phase==='playing'&&before.owner&&!now.owner&&Math.hypot(state.ball.vx,state.ball.vy)>4;
  if(taggedRelease||legacyRelease){
   events.push('kick');
   const shooter=state.players.find(p=>p.id===(taggedRelease?release?.playerId:before.owner)),t=getTuning(state),b=state.ball;
   const speed=Math.hypot(b.vx,b.vy),sign=shooter?.team==='home'?1:-1;
   const travel=(sign*t.fieldWidth/2-b.x)/b.vx;
   // Legacy untagged fixtures retain conservative inference. Real engine actions are explicit.
   const shotSpeed=Math.abs(speed-t.kickPower)<=Math.max(.6,t.kickPower*.08);
   const passSpeed=Math.abs(speed-t.passPower)<=Math.max(.6,t.passPower*.08);
   const isShot=taggedRelease?release?.type==='shot':shotSpeed&&!passSpeed;
   if(shooter?.role==='outfield'&&isShot&&b.vx*sign>0&&travel>0&&Math.abs(b.y+b.vy*travel)<=t.goalWidth/2&&state.elapsed>=this.nextShot){events.push('crowd-shot');this.nextShot=state.elapsed+2;}
  }
  const owner=state.players.find(p=>p.id===now.owner);
  if(owner?.team==='home'&&owner.role==='outfield'&&owner.id===state.controlledId&&state.elapsed>=this.nextCall){
   const opponents=state.players.filter(p=>p.team!==owner.team);
   const open=state.players.some(p=>p.team===owner.team&&p.role==='outfield'&&p.id!==owner.id&&Math.hypot(p.x-owner.x,p.y-owner.y)>=3&&Math.hypot(p.x-owner.x,p.y-owner.y)<=14&&opponents.every(e=>Math.hypot(p.x-e.x,p.y-e.y)>2.4&&laneDistance(e,owner,p)>1.2));
   if(open){events.push(this.call++%2===0?'pass-me':'here');this.nextCall=state.elapsed+8;}
  }
  return events;
 }
}
