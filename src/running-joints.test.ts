import {it,expect}from 'vitest';
import * as THREE from 'three';
import {createGame}from '../shared/engine';
import {createFigure,poseFigure}from './scene';
it.each(createGame().players)('articulates knees and elbows for $id and restores reduced-motion/cheer poses',player=>{
 const original=structuredClone(player);const rig=createFigure(player,0);
 const knees=rig.root.getObjectsByProperty('name','running-knee') as THREE.Group[];
 const elbows=rig.root.getObjectsByProperty('name','running-elbow') as THREE.Group[];
 expect(knees).toHaveLength(2);expect(elbows).toHaveLength(2);
 poseFigure(rig,player,0,false);const running={...player,x:player.x+.3,vx:6};poseFigure(rig,running,.05,false);
 expect(Math.max(...knees.map(p=>p.rotation.x))).toBeGreaterThan(.15);
 expect(Math.abs(knees[0].rotation.x-knees[1].rotation.x)).toBeGreaterThan(.1);
 expect(elbows.every(e=>e.rotation.x<-.1)).toBe(true);
 poseFigure(rig,running,.1,true);for(const joint of [...knees,...elbows])expect(joint.rotation.x).toBe(0);
 poseFigure(rig,running,.15,false,{style:1,seconds:.5,index:0});for(const joint of [...knees,...elbows])expect(joint.rotation.x).toBe(0);
 expect(player).toEqual(original);
});
