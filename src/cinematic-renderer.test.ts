import {afterEach,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {ToyRenderer} from './renderer';
import {createGame} from '../shared/engine';
import {getTuning} from '../shared/tuning';
import {createFigure} from './scene';
afterEach(()=>vi.unstubAllGlobals());
vi.mock('./scene',async importOriginal=>({...await importOriginal<typeof import('./scene')>(),poseFigure:vi.fn((rig,player)=>{rig.root.position.set(player.x+1,.1,player.y+2);rig.root.rotation.y=0;})}));
function element(){
 const node:any={dataset:{},style:{},textContent:'',classList:{toggle:vi.fn()},setAttribute:vi.fn(),children:[]};
 node.append=(child:any)=>{child.remove();node.children.push(child);child.parentElement=node;};
 node.remove=()=>{if(node.parentElement){const siblings=node.parentElement.children;siblings.splice(siblings.indexOf(node),1);node.parentElement=null;}};
 return node;
}
function fixture(){
 vi.stubGlobal('document',{createElement:()=>element()});
 const state=createGame();state.phase='intro';state.phaseTimer=6.5;
 state.controls=[{seatId:'p1',team:'home',playerId:'home-0'},{seatId:'p2',team:'away',playerId:'away-0'}];
 const tuning=getTuning(state),figures=new Map(state.players.map(p=>[p.id,{root:new THREE.Group()}]));
 const host={clientWidth:800,clientHeight:500,dataset:{} as Record<string,string>};
 const renderer=Object.assign(Object.create(ToyRenderer.prototype),{host,tuning,entryHeight:tuning.fieldHeight,geometrySignature:[tuning.fieldWidth,tuning.fieldHeight,tuning.goalWidth,tuning.goalHeight,tuning.fieldHeight].join(':'),boardRebuilds:0,lastRender:0,motionTime:0,reducedMotion:{matches:false},needsFrame:true,figures,markers:new Map(),shadows:new Map(state.players.map(p=>[p.id,new THREE.Mesh()])),selection:new THREE.Group(),selections:new Map(),projected:new THREE.Vector3(),camera:new THREE.OrthographicCamera(),ball:new THREE.Group(),ballShadow:new THREE.Mesh(undefined,new THREE.MeshBasicMaterial()),renderer:{render:vi.fn(),info:{render:{frame:1}}},scene:new THREE.Scene()});
 renderer.rigKeys=new Map(state.players.map(p=>[p.id,`${p.team}:${p.role}:${p.tacticalRole}`]));
 renderer.selection.add(new THREE.Mesh(new THREE.RingGeometry(.7,.9),new THREE.MeshBasicMaterial()));
 renderer.labels=element();renderer.seatBadges=new Map();
 renderer.markers=new Map(state.players.map(p=>{const marker=element();renderer.labels.append(marker);return [p.id,marker];}));
 return {state,renderer,host,figures};
}
it('renders both team spotlights, moving-root diagnostics, and independent human selectors',()=>{
 const {state,renderer,host}=fixture();renderer.render(state,100);
 expect(host.dataset).toMatchObject({cameraMode:'intro',introShot:'home'});
 expect(JSON.parse(host.dataset.controlledPlayers)).toEqual({p1:'home-0',p2:'away-0'});
 expect(JSON.parse(host.dataset.playerPositions)['home-0']).toEqual({x:state.players[0].x+1,z:state.players[0].y+2});
 expect(renderer.selections.size).toBe(2);
 state.phaseTimer=3;renderer.render(state,150);expect(host.dataset.introShot).toBe('away');
 state.phase='playing';renderer.render(state,200);expect(host.dataset.cameraMode).toBe('wide');
 expect(renderer.camera.position.toArray()).toEqual([3,34,29]);
});
it('freezes intro poses on pause and restores static wide reduced motion',()=>{
 const {state,renderer,host}=fixture();renderer.render(state,100);const time=renderer.motionTime;
 renderer.render(state,150,true);expect(renderer.motionTime).toBe(time);
 renderer.reducedMotion.matches=true;renderer.render(state,200);expect(host.dataset.cameraMode).toBe('wide');
});
it('resets presentation time on reused ready state and keeps static GPU frames cached',()=>{
 const {state,renderer}=fixture();renderer.render(state,100);state.phase='ready';renderer.render(state,150);
 expect(renderer.motionTime).toBe(0);const calls=renderer.renderer.render.mock.calls.length;
 renderer.render(state,200);expect(renderer.renderer.render.mock.calls.length).toBe(calls);
});
it('supports four seats, legacy fallback and role-change rig replacement without duplication',()=>{
 const {state,renderer,figures}=fixture();
 state.controls!.push({seatId:'p3',team:'home',playerId:'home-1'},{seatId:'p4',team:'away',playerId:'away-1'});
 renderer.render(state,100);expect(renderer.selections.size).toBe(4);
 expect(new Set([...renderer.selections.values()].map((ring:THREE.Group)=>(ring.children[0] as THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>).material.color.getHex())).size).toBe(4);
 const old=figures.get('home-0')!.root;state.players[0].tacticalRole='defender';renderer.render(state,150);
 expect(figures.get('home-0')!.root).not.toBe(old);expect(figures.get('home-0')!.root.userData.characterId).toBe('A2');
 const replacement=figures.get('home-0')!.root;renderer.render(state,200);expect(figures.get('home-0')!.root).toBe(replacement);
 state.controls=undefined;renderer.render(state,250);expect(renderer.selections.size).toBe(1);
});
it('keeps all current rings distinct when seat membership changes',()=>{
 const {state,renderer}=fixture();renderer.render(state,100);
 state.controls=[state.controls![1],{seatId:'p3',team:'home',playerId:'home-1'}];renderer.render(state,150);
 const colors=[...renderer.selections.values()].map((ring:THREE.Group)=>(ring.children[0] as THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>).material.color.getHex());
 expect(new Set(colors).size).toBe(2);
});
it('keeps ten plain roles with four distinct projected sibling badges and reuses them on restart',()=>{
 const {state,renderer}=fixture();
 state.controls!.push({seatId:'p3',team:'home',playerId:'home-1'},{seatId:'p4',team:'away',playerId:'away-1'});
 renderer.render(state,100);expect(renderer.markers.size).toBe(10);
 for(const marker of renderer.markers.values())expect(marker.textContent).toMatch(/^(A|M|D|GK)$/);
 expect(renderer.seatBadges.size).toBe(4);
 expect(new Set([...renderer.seatBadges.values()].map((badge:any)=>badge.textContent))).toEqual(new Set(['P1','P2','P3','P4']));
 state.controls!.forEach(control=>{
  const badge=renderer.seatBadges.get(control.seatId),marker=renderer.markers.get(control.playerId);
  expect(badge.parentElement).toBe(renderer.labels);expect(badge.className).toBe('seat-badge');
  expect(badge.dataset).toMatchObject({seat:control.seatId,player:control.playerId});
  expect(marker.dataset.seat).toBe(control.seatId);expect(marker.dataset.role).toBe(marker.textContent);
  expect(badge.style.transform).toBe(marker.style.transform+' translateY(-26px)');
  expect(badge.style.color).toBe('#'+renderer.selections.get(control.seatId).children[0].material.color.getHexString());
  expect(badge.setAttribute).toHaveBeenCalledWith('aria-label',expect.stringContaining(control.seatId));
 });
 const badge=renderer.seatBadges.get('p1');state.players[0].tacticalRole='defender';renderer.render(state,150);
 state.phase='ready';renderer.render(state,200);renderer.render(state,250);
 expect(renderer.seatBadges.get('p1')).toBe(badge);expect(renderer.labels.children.length).toBe(14);
 state.controls![0].playerId='home-2';renderer.render(state,300);
 expect(renderer.seatBadges.get('p1')).toBe(badge);expect(badge.dataset.player).toBe('home-2');
 expect(badge.style.transform).toBe(renderer.markers.get('home-2').style.transform+' translateY(-26px)');
 expect(renderer.markers.get('home-0').dataset.seat).toBe('');expect(renderer.labels.children.length).toBe(14);
});
it('removes obsolete badges on seat/player removal and disposal',()=>{
 const {state,renderer}=fixture();renderer.render(state,100);
 const removed=renderer.seatBadges.get('p1');state.controls=state.controls!.slice(1);renderer.render(state,150);
 expect(removed.parentElement).toBeNull();expect(renderer.seatBadges.size).toBe(1);
 state.players=state.players.filter(p=>p.id!=='away-0');renderer.render(state,200);
 expect(renderer.seatBadges.size).toBe(0);expect(renderer.markers.size).toBe(9);
 state.controls=[{seatId:'p3',team:'home',playerId:'home-1'}];renderer.render(state,250);
 const badge=renderer.seatBadges.get('p3');renderer.observer={disconnect:vi.fn()};renderer.board=new THREE.Group();
 renderer.renderer.setAnimationLoop=vi.fn();renderer.renderer.dispose=vi.fn();renderer.renderer.domElement=element();
 renderer.dispose();expect(renderer.seatBadges.size).toBe(0);expect(badge.parentElement).toBeNull();
});
it('centers real original and adult face surfaces with transformed body height',()=>{
 for(const team of ['home','away'] as const){
  const {state,renderer,figures}=fixture();state.phaseTimer=team==='home'?6.5:3.5;
  const player=state.players.find(p=>p.team===team&&p.role==='outfield')!;
  const rig=createFigure(player,0);figures.set(player.id,rig);
  rig.root.position.set(player.x,.35,player.y);rig.root.rotation.y=team==='home'?Math.PI/2:-Math.PI/2;
  rig.body.position.y=.2;rig.body.rotation.z=.12;
  const face=rig.root.getObjectByName('face') as THREE.Mesh;
  expect(face.position.y).toBeCloseTo(team==='home'?2.77:2.11);
  rig.root.updateMatrixWorld(true);
  const surface=face.localToWorld(new THREE.Vector3(0,0,1));
  renderer.updateCamera(state);
  const projected=surface.clone().project(renderer.camera);
  expect(projected.x).toBeCloseTo(0,6);expect(projected.y).toBeCloseTo(0,6);
  const direction=renderer.camera.position.clone().sub(surface);
  expect(Math.abs(direction.z)).toBeGreaterThan(2.5);
  // At an opponent two units down the kickoff axis, the camera ray is
  // already outside a mould's shoulder half-width (no hidden occluders).
  expect(Math.abs(direction.z/direction.x)*2).toBeGreaterThan(.8);
  face.name='unnamed-head';renderer.updateCamera(state);
  expect(renderer.camera.position.y).toBeCloseTo(.35+(team==='home'?2.77:2.11)+.8);
 }
});
it('keeps shortest-angle team blends continuous and paused camera transforms frozen',()=>{
 const {state,renderer,figures}=fixture();
 figures.get('home-0')!.root.rotation.y=Math.PI-.05;
 figures.get('away-0')!.root.rotation.y=-Math.PI+.05;
 state.phaseTimer=4.25;renderer.updateCamera(state);
 expect(renderer.camera.position.z).toBeLessThan(-5);
 const before=renderer.camera.position.clone();state.phaseTimer=4.249;renderer.updateCamera(state);
 expect(renderer.camera.position.distanceTo(before)).toBeLessThan(.1);
 renderer.render(state,100);const position=renderer.camera.position.clone(),quaternion=renderer.camera.quaternion.clone();
 renderer.render(state,200,true);
 expect(renderer.camera.position.equals(position)).toBe(true);expect(renderer.camera.quaternion.equals(quaternion)).toBe(true);
});
