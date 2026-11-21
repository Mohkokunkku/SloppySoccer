import * as THREE from 'three';
/** Dispose an owned render tree, including per-instance skin/kit texture maps. */
export function disposeRenderResources(root:THREE.Object3D):void{
 const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
 root.traverse(object=>{if(object instanceof THREE.Mesh){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);}});
 for(const material of materials)for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);
 geometries.forEach(geometry=>geometry.dispose());textures.forEach(texture=>texture.dispose());materials.forEach(material=>material.dispose());
}
