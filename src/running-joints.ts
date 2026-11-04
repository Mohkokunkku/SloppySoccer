import * as THREE from 'three';
/** Add secondary pivots without changing the mould's neutral world geometry. */
export function articulateRunningRig<T extends {legs:THREE.Group[];arms:THREE.Group[]}>(rig:T,athletic:boolean):T&{knees:THREE.Group[];elbows:THREE.Group[]}{
 const joint=(parent:THREE.Group,name:string,y:number,z:number,threshold:number)=>{
  const pivot=new THREE.Group();pivot.name=name;pivot.position.set(0,y,z);
  for(const child of [...parent.children])if(child.position.y<threshold){child.position.sub(pivot.position);pivot.add(child);}
  parent.add(pivot);return pivot;
 };
 const knees=rig.legs.map(leg=>joint(leg,'running-knee',athletic?-.73:-.55,athletic?.055:0,athletic?-.75:-.55));
 const elbows=rig.arms.map(arm=>joint(arm,'running-elbow',athletic?-.48:-.35,athletic?.035:.02,athletic?-.49:-.3));
 return {...rig,knees,elbows};
}
