import {it,expect}from 'vitest';
import * as THREE from 'three';
import {buildTabletop,cameraBounds,disposeTabletop}from './scene';
import {DEFAULT_TUNING}from '../shared/tuning';
it.each([12,30])('keeps the original doorway anchor while the live pitch becomes %s high',height=>{
 const tuning={...DEFAULT_TUNING,fieldHeight:height};const board=buildTabletop(tuning,20);
 expect(board.getObjectByName('entry-tunnel')!.position.z).toBe(12);
 const pitch=board.getObjectByName('pitch') as THREE.Mesh;const box=new THREE.Box3().setFromObject(pitch);expect(box.max.z-box.min.z).toBeCloseTo(height);
 const wood=new THREE.Box3().setFromObject(board.getObjectByName('oak-plinth')!);expect(wood.max.z).toBeGreaterThanOrEqual(13.39);
 expect(cameraBounds(1.7,tuning,20).height).toBeGreaterThanOrEqual(cameraBounds(1.7,DEFAULT_TUNING).height);
 disposeTabletop(board);
});
