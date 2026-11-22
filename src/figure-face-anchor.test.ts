import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createGame} from '../shared/engine';
import {createFigure} from './scene';
import {createArgentinaCandidate,disposeArgentinaCandidate} from './argentina-candidate-models';
import {figureFaceAnchor} from './figure-face-anchor';
it('anchors translated Argentina lathe faces at the head, not the root or a unit-sphere point',()=>{
 for(const id of ['P04','P01','P06','P05','K01'] as const){const rig=createArgentinaCandidate(id);rig.root.position.set(3,.1,-2);rig.root.rotation.y=.7;
  const anchor=figureFaceAnchor(rig),face=rig.root.getObjectByName('face') as THREE.Mesh;const box=new THREE.Box3().setFromObject(face);
  expect(anchor.y).toBeGreaterThan(box.min.y);expect(anchor.y).toBeLessThan(box.max.y);expect(anchor.y).toBeGreaterThan(2.4);
  expect(anchor.toArray().every(Number.isFinite)).toBe(true);disposeArgentinaCandidate(rig);
 }
});
it('preserves the existing Spain sphere-face camera target exactly',()=>{const p=createGame().players[0],rig=createFigure(p,0);rig.root.position.set(2,.1,4);rig.root.rotation.y=1.1;rig.root.updateMatrixWorld(true);const face=rig.root.getObjectByName('face')!;expect(figureFaceAnchor(rig).distanceTo(face.localToWorld(new THREE.Vector3(0,0,1)))).toBeLessThan(1e-6);});
