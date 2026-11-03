import {it,expect} from 'vitest';
import * as THREE from 'three';
import {createGame} from '../shared/engine';
import {createFigure,poseFigure} from './scene';
it('uses A1, A3 and A2 together as Spain attacker, midfield and defender without changing simulation',()=>{
 const state=createGame();const before=structuredClone(state);const figures=state.players.slice(0,3).map((p,i)=>createFigure(p,i));
 expect(figures.map(f=>f.root.userData.characterId)).toEqual(['A1','A3','A2']);
 expect(state).toEqual(before);
 expect(createFigure(state.players[3],3).root.userData.characterId).toBeUndefined();
 for(let i=4;i<8;i++)expect(createFigure(state.players[i],i).root.userData.characterId).toBeUndefined();
});
it('makes the captain visibly broader and bearded, and the runner distinguishable by a headband',()=>{
 const p=createGame().players;const a1=createFigure(p[0],0),a2=createFigure(p[2],2),a3=createFigure(p[1],1);
 const width=(f:typeof a1)=>new THREE.Box3().setFromObject(f.root.getObjectByName('jersey')!).getSize(new THREE.Vector3()).x;
 expect(width(a2)).toBeGreaterThan(width(a1)+0.1);expect(width(a3)).toBeLessThan(width(a2));
 expect(a1.root.getObjectByName('beard')).toBeUndefined();expect(a2.root.getObjectByName('beard')).toBeDefined();expect(a3.root.getObjectByName('headband')).toBeDefined();
});
it('keeps the adult moulds grounded, within toy scale and compatible with walking/cheering',()=>{
 const p=createGame().players;
 for(let i=0;i<3;i++){
  const rig=createFigure(p[i],i);poseFigure(rig,p[i],0,false);const box=new THREE.Box3().setFromObject(rig.root);const size=box.getSize(new THREE.Vector3());
  expect(size.y).toBeGreaterThan(2.8);expect(size.y).toBeLessThan(3.5);expect(box.min.y).toBeGreaterThan(0);
  expect(rig.root.userData.markerHeight).toBeGreaterThan(size.y);
  for(const style of [0,1,2]){poseFigure(rig,p[i],1,false,{style,seconds:0.3,index:i});expect(Number.isFinite(rig.arms[0].rotation.z)).toBe(true);}
  poseFigure(rig,p[i],0,true);expect(rig.arms[0].rotation.z).toBeCloseTo(-0.26);
 }
});
