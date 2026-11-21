import * as THREE from 'three';
import type {FigureRig} from './scene';
/** Front of the actual face geometry: supports scaled spheres and translated lathe moulds. */
export function figureFaceAnchor(rig:FigureRig):THREE.Vector3{
 rig.root.updateMatrixWorld(true);
 const face=rig.root.getObjectByName('face');
 if(face instanceof THREE.Mesh){
  if(!face.geometry.boundingBox)face.geometry.computeBoundingBox();
  const bounds=face.geometry.boundingBox;
  if(bounds){const point=bounds.getCenter(new THREE.Vector3());point.z=bounds.max.z;return face.localToWorld(point);}
 }
 return rig.root.localToWorld(new THREE.Vector3(0,rig.root.userData.characterId?2.77:2.11,rig.root.userData.characterId ? .224 : .3));
}
