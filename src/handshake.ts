import * as THREE from 'three';
import type {Player} from '../shared/types';
import type {FigureRig} from './scene';

export interface HandshakeTarget {homeId:string;awayId:string;home:{x:number;y:number;facing:number};away:{x:number;y:number;facing:number}}
export function handshakeLayout(players:readonly Player[]):HandshakeTarget[]{
 const home=players.filter(p=>p.team==='home').slice().sort((a,b)=>a.id.localeCompare(b.id));
 const away=players.filter(p=>p.team==='away').slice().sort((a,b)=>a.id.localeCompare(b.id));
 const count=Math.min(home.length,away.length);
 return home.slice(0,count).map((p,i)=>({homeId:p.id,awayId:away[i].id,home:{x:-.4,y:(i-(count-1)/2)*2.3,facing:0},away:{x:.4,y:(i-(count-1)/2)*2.3,facing:Math.PI}}));
}
function armParts(rig:FigureRig){
 const arm=rig.arms[1],elbow=rig.elbows?.[1];
 const hand=elbow?.getObjectByName('hand')??elbow?.children.find(o=>o instanceof THREE.Mesh&&o.geometry instanceof THREE.SphereGeometry);
 if(!arm||!elbow||!hand)return null;
 arm.rotation.set(0,0,0);elbow.rotation.set(0,0,0);rig.root.updateMatrixWorld(true);
 return {rig,arm,elbow,hand,upper:elbow.position.clone(),lower:hand.position.clone(),shoulder:arm.getWorldPosition(new THREE.Vector3())};
}
type ArmParts=NonNullable<ReturnType<typeof armParts>>;
/** Two connected rigid segments, solved in the shoulder parent's space. */
function solve(parts:ArmParts,target:THREE.Vector3):THREE.Vector3{
 const {rig,arm,elbow,hand,upper,lower}=parts;
 const delta=arm.parent!.worldToLocal(target.clone()).sub(arm.position);
 const a=upper.length(),b=lower.length();
 const distance=THREE.MathUtils.clamp(delta.length(),Math.abs(a-b)+1e-6,a+b-1e-6),direction=delta.normalize();
 const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
 let bend=new THREE.Vector3(0,-1,0).addScaledVector(direction,direction.y);
 if(bend.lengthSq()<1e-8)bend=new THREE.Vector3(0,0,1).addScaledVector(direction,-direction.z);
 bend.normalize();const elbowVector=direction.clone().multiplyScalar(along).addScaledVector(bend,height);
 arm.quaternion.setFromUnitVectors(upper.clone().normalize(),elbowVector.clone().normalize());
 const lowerVector=direction.multiplyScalar(distance).sub(elbowVector).applyQuaternion(arm.quaternion.clone().invert());
 elbow.quaternion.setFromUnitVectors(lower.clone().normalize(),lowerVector.normalize());
 rig.root.updateMatrixWorld(true);return hand.getWorldPosition(new THREE.Vector3());
}
/** Both real right hands share a target and gentle pump; moulds are never stretched. */
export function poseHandshakePair(home:FigureRig,away:FigureRig,seconds:number,reducedMotion=false):{homeHand:THREE.Vector3;awayHand:THREE.Vector3}{
 const h=armParts(home),a=armParts(away);
 if(!h||!a)return {homeHand:home.root.position.clone(),awayHand:away.root.position.clone()};
 const homeReach=h.upper.length()+h.lower.length(),awayReach=a.upper.length()+a.lower.length();
 const point=h.shoulder.clone().lerp(a.shoulder,homeReach/(homeReach+awayReach));
 point.y+=reducedMotion?0:.025*Math.sin((Number.isFinite(seconds)?seconds:0)*Math.PI*2);
 return {homeHand:solve(h,point),awayHand:solve(a,point)};
}
