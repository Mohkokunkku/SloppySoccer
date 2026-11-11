import {afterEach,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {ToyRenderer} from './renderer';
import {createGame} from '../shared/engine';
import {getTuning} from '../shared/tuning';
import {createFigure,poseFigure,setFigureExpression} from './scene';
import type {PostMatchView} from './post-match';

afterEach(()=>vi.unstubAllGlobals());
function element(){const node:any={dataset:{},style:{},textContent:'',classList:{toggle:vi.fn()},setAttribute:vi.fn(),children:[]};node.append=(child:any)=>{child.remove();node.children.push(child);child.parentElement=node;};node.remove=()=>{if(node.parentElement){const parent=node.parentElement;parent.children.splice(parent.children.indexOf(node),1);node.parentElement=null;}};return node;}
function fixture(){
 vi.stubGlobal('document',{createElement:()=>element()});
 const state=createGame();state.phase='finished';state.score={home:2,away:1};
 const tuning=getTuning(state),figures=new Map(state.players.map((p,i)=>[p.id,createFigure(p,i)]));
 const host={clientWidth:800,clientHeight:500,dataset:{} as Record<string,string>};const renderer=Object.assign(Object.create(ToyRenderer.prototype),{host,tuning,entryHeight:tuning.fieldHeight,geometrySignature:[tuning.fieldWidth,tuning.fieldHeight,tuning.goalWidth,tuning.goalHeight,tuning.fieldHeight].join(':'),boardRebuilds:0,lastRender:0,motionTime:0,reducedMotion:{matches:false},needsFrame:true,figures,markers:new Map(),shadows:new Map(state.players.map(p=>[p.id,new THREE.Mesh()])),selection:new THREE.Group(),selections:new Map(),projected:new THREE.Vector3(),camera:new THREE.OrthographicCamera(),ball:new THREE.Group(),ballShadow:new THREE.Mesh(undefined,new THREE.MeshBasicMaterial()),renderer:{render:vi.fn(),info:{render:{frame:1}}},scene:new THREE.Scene(),rigKeys:new Map(state.players.map(p=>[p.id,`${p.team}:${p.role}:${p.tacticalRole}`])),labels:element(),seatBadges:new Map(),syncFigures:vi.fn(),updateCamera:vi.fn()});
 renderer.pose=undefined;for(const [id,rig] of figures)renderer.scene.add(rig.root);
 return {state,renderer,host,figures};
}
const view=(overrides:Partial<PostMatchView>={}):PostMatchView=>({id:'test',active:true,winner:'home',theme:0,elapsed:1,segment:'winners',...overrides});
it('frames the real face in winner and loser shots and groups the winning team',()=>{
 const {state,renderer,figures}=fixture();renderer.render(state,100,false,view({elapsed:.5}));
 expect(renderer.camera.right-renderer.camera.left).toBeLessThan(9);
 const roots=state.players.filter(p=>p.team==='home').map(p=>figures.get(p.id)!.root.position.x);
 expect(Math.max(...roots)-Math.min(...roots)).toBeLessThan(9);
 renderer.render(state,200,false,view({elapsed:7,segment:'losers'}));expect(renderer.camera.right-renderer.camera.left).toBeLessThan(9);
});
it.each(['home-0','away-0','home-3'] as const)('uses visible curved expression geometry for %s and restores the original mouth',id=>{
 const {state,figures}=fixture(),p=state.players.find(p=>p.id===id)!,rig=figures.get(id)!;
 poseFigure(rig,p,0,false);const mouth=rig.root.getObjectByName('mouth');expect(mouth).toBeDefined();
 setFigureExpression(rig,'happy');const party=rig.root.getObjectByName('party-mouth') as THREE.Mesh;
 expect(party?.geometry).toBeInstanceOf(THREE.TorusGeometry);expect(party.visible).toBe(true);expect(mouth!.visible).toBe(false);
 setFigureExpression(rig,'frustrated');expect(party.rotation.z).toBe(0);
 poseFigure(rig,p,0,false);expect(party.visible).toBe(false);expect(mouth!.visible).toBe(true);
});
it('animates finished winner/loser reactions and exposes view diagnostics without changing state',()=>{
 const {state,renderer,host,figures}=fixture();const original=JSON.stringify(state);renderer.render(state,100,false,view());
 expect(host.dataset).toMatchObject({postMatchActive:'true',postMatchTheme:'0',postMatchSegment:'winners',postMatchWinner:'home'});
 expect(renderer.renderer.render).toHaveBeenCalled();expect(JSON.stringify(state)).toBe(original);
 expect(figures.get('home-0')!.root.position.y).toBeGreaterThan(.1);
 expect(figures.get('away-0')!.body.rotation.x).toBeCloseTo(-.42);
});
it('freezes pose and camera while paused; reduced motion stays wide and inactive restores normal camera',()=>{
 const {state,renderer,host,figures}=fixture();renderer.render(state,100,false,view());const pos=figures.get('home-0')!.root.position.clone(),cam=renderer.camera.position.clone();renderer.render(state,200,true,view({elapsed:4}));expect(figures.get('home-0')!.root.position.equals(pos)).toBe(true);expect(renderer.camera.position.equals(cam)).toBe(true);
 renderer.reducedMotion.matches=true;renderer.render(state,300,false,view({segment:'finale'}));expect(host.dataset.cameraMode).toBe('wide');
 renderer.render(state,400,false,view({active:false,segment:'done'}));expect(host.dataset.postMatchActive).toBe('false');expect(renderer.updateCamera).toHaveBeenCalled();
});
it('varies close-up framing by theme and uses neutral wide draw framing',()=>{
 const {state,renderer}=fixture();renderer.render(state,100,false,view({theme:0}));const left=renderer.camera.left;renderer.render(state,150,false,view({theme:2}));expect(renderer.camera.left).not.toBe(left);
 renderer.render(state,200,false,view({winner:null,segment:'draw'}));expect(renderer.camera.left).toBeLessThan(-10);
});
