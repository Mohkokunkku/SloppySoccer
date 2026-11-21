import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createGame} from '../shared/engine';
import {createFigure,poseFigure,setFigureExpression} from './scene';
it('dispatches the five confirmed Argentina moulds through the real match factory without changing simulation',()=>{
 const state=createGame(),before=structuredClone(state);
 const expected={'away-0':'P04','away-1':'P01','away-2':'P06','away-4':'P05','away-3':'K01'};
 for(const [id,candidate] of Object.entries(expected)){
  const player=state.players.find(p=>p.id===id)!,rig=createFigure(player,state.players.indexOf(player));
  expect(rig.root.userData.candidateId,id).toBe(candidate);expect(rig.root.userData.characterId).toBe(candidate);
  expect(rig.knees).toHaveLength(2);expect(rig.elbows).toHaveLength(2);
  for(const style of [0,1,2]){poseFigure(rig,player,1,false,{style,seconds:.4,index:0});setFigureExpression(rig,'happy');setFigureExpression(rig,'frustrated');}
  poseFigure(rig,player,2,true);rig.root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(rig.root);expect(Number.isFinite(box.max.y)).toBe(true);expect(box.min.y).toBeCloseTo(.1,2);
  expect(rig.root.userData.markerHeight+rig.root.position.y).toBeGreaterThan(box.max.y);
  const mouth=rig.body.getObjectByName('mouth')!;expect(mouth.visible).toBe(true);expect(rig.body.getObjectByName('party-mouth')?.visible).toBe(false);
 }
 expect(state).toEqual(before);
});
