import {expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {createArgentinaCandidate} from './argentina-candidate-models';
import {disposeRenderResources} from './render-resources';
it('releases per-player shirt textures without disposing a different live player',()=>{
 const a=createArgentinaCandidate('P01'),b=createArgentinaCandidate('P01');
 const am=(a.root.getObjectByName('jersey') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshPhysicalMaterial>).material;
 const bm=(b.root.getObjectByName('jersey') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshPhysicalMaterial>).material;
 const first=vi.fn(),second=vi.fn();am.map!.addEventListener('dispose',first);bm.map!.addEventListener('dispose',second);
 disposeRenderResources(a.root);expect(first).toHaveBeenCalledTimes(1);expect(second).not.toHaveBeenCalled();disposeRenderResources(b.root);expect(second).toHaveBeenCalledTimes(1);
});
it('deduplicates shared geometry, materials and texture slots within a released tree',()=>{const root=new THREE.Group(),texture=new THREE.Texture(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial({map:texture,emissiveMap:texture});root.add(new THREE.Mesh(geometry,material),new THREE.Mesh(geometry,material));const calls=[vi.fn(),vi.fn(),vi.fn()];geometry.addEventListener('dispose',calls[0]);material.addEventListener('dispose',calls[1]);texture.addEventListener('dispose',calls[2]);disposeRenderResources(root);for(const spy of calls)expect(spy).toHaveBeenCalledTimes(1);});
