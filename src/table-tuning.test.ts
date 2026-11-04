import {expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {buildTabletop,cameraBounds,disposeTabletop} from './scene';
import {DEFAULT_TUNING} from '../shared/tuning';
import {ToyRenderer} from './renderer';
import type {GameState} from '../shared/types';
import {createGame,startGame} from '../shared/engine';
import {applyTuning} from '../shared/tuning';

vi.mock('three',async importOriginal=>{
 const actual=await importOriginal<typeof import('three')>();
 return {...actual,WebGLRenderer:class {
  domElement={setAttribute:()=>{},remove:()=>{},tabIndex:0};shadowMap={enabled:false,type:0};
  setPixelRatio(){} setClearColor(){} setSize(){} render(){} setAnimationLoop(){} dispose(){}
 }};
});
it('scales pitch, goals, deck and camera to live geometry',()=>{
 const tuning={...DEFAULT_TUNING,fieldWidth:48,fieldHeight:30,goalWidth:10,goalHeight:4};
 const board=buildTabletop(tuning);
 const pitch=board.getObjectByName('pitch') as THREE.Mesh;pitch.geometry.computeBoundingBox();
 expect(pitch.geometry.boundingBox!.max.x-pitch.geometry.boundingBox!.min.x).toBe(48);
 expect(board.getObjectByName('goal-away')!.position.x).toBe(24);
 expect(new THREE.Box3().setFromObject(board.getObjectByName('goal-away')! ).max.y).toBeGreaterThanOrEqual(4);
 expect(board.getObjectByName('entry-tunnel')!.position.z).toBe(17);
 expect(board.getObjectByName('door-home')!.userData.label).toBeTruthy();expect(board.getObjectByName('door-away')).toBeDefined();
 expect(cameraBounds(1.7,tuning).width).toBeGreaterThan(cameraBounds(1.7).width);
});
it('disposes owned board assets without disposing shared resources',()=>{
 const a=buildTabletop(),b=buildTabletop();
 const pitch=a.getObjectByName('pitch') as THREE.Mesh;const spy=vi.spyOn(pitch.geometry,'dispose');
 const instances=vi.spyOn(a.getObjectByName('lattice') as THREE.InstancedMesh,'dispose');
 const lattice=b.getObjectByName('lattice') as THREE.Mesh;const shared=vi.spyOn(lattice.material as THREE.Material,'dispose');
 disposeTabletop(a);expect(spy).toHaveBeenCalledOnce();expect(shared).not.toHaveBeenCalled();expect(instances).toHaveBeenCalledOnce();
});

it('rebuilds only geometry, preserves rigs and markers, and freezes entrance poses and spin on pause',()=>{
 const element=()=>({className:'',dataset:{},style:{},textContent:'',classList:{toggle:()=>{}},setAttribute:()=>{},append:()=>{},remove:()=>{}});
 vi.stubGlobal('window',{matchMedia:()=>({matches:false}),devicePixelRatio:1});
 vi.stubGlobal('document',{createElement:element});
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
 try{
  const host={...element(),clientWidth:900,clientHeight:600};
  const state:GameState={phase:'entering',players:[{id:'h1',team:'home',role:'outfield',x:-2,y:12,vx:0,vy:-4,facing:0,stamina:1}],ball:{x:0,y:0,z:0,vx:20,vy:0,vz:0,ownerId:null},score:{home:0,away:0},timeRemaining:120,phaseTimer:0,controlledId:'h1',lastScorer:null,elapsed:0};
  const renderer=new ToyRenderer(host as unknown as HTMLElement,state);
  renderer.render(state,100);state.players[0].y-=.2;renderer.render(state,150);
  const rig=renderer.scene.getObjectByName('player-h1')!;
  const frozen=rig.toJSON();const phase=(host.dataset as Record<string,string>).runPhase;
  renderer.render(state,200,true);expect(rig.toJSON()).toEqual(frozen);expect((host.dataset as Record<string,string>).runPhase).toBe(phase);
  state.tuning={...DEFAULT_TUNING,runSpeed:8};renderer.render(state,250);expect((host.dataset as Record<string,string>).boardRebuilds).toBe('0');
  state.tuning.fieldWidth=40;renderer.render(state,300);renderer.render(state,350);
  expect((host.dataset as Record<string,string>).boardRebuilds).toBe('1');expect(renderer.scene.getObjectByName('player-h1')).toBe(rig);
  state.phase='playing';renderer.render(state,400);state.ball.x=.28;renderer.render(state,450);
  const rotation=(host.dataset as Record<string,string>).ballRotation;const ballPosition=renderer.scene.getObjectByName('football')!.position.clone();state.ball.x=1;
  renderer.render(state,500,true);expect((host.dataset as Record<string,string>).ballRotation).toBe(rotation);expect(renderer.scene.getObjectByName('football')!.position).toEqual(ballPosition);
  const football=renderer.scene.getObjectByName('football')!;const orientation=football.rotation.clone();
  expect(Math.abs(orientation.z)).toBeGreaterThan(0);
  for(const key of ['fieldWidth','fieldHeight','goalWidth','goalHeight'] as const){
   state.tuning[key]+=1;renderer.render(state,550,true);
   expect(football.rotation.toArray()).toEqual(orientation.toArray());
   renderer.render(state,600);expect(football.rotation.toArray()).toEqual(orientation.toArray());
  }
  const next=createGame();next.phase='playing';next.ball.x=state.ball.x+.28;
  renderer.render(next,650);expect(football.rotation.toArray()).toEqual(orientation.toArray());
  renderer.render(next,700);expect(football.rotation.toArray()).toEqual(orientation.toArray());
  next.ball.x+=.28;renderer.render(next,750);expect(football.rotation.z).toBeCloseTo(orientation.z-1);
  expect(state.timeRemaining).toBe(120);renderer.dispose();
 }finally{vi.unstubAllGlobals();}
});

it('retains the entrance anchor through live pitch resizing and releases it at kickoff',()=>{
 const element=()=>({className:'',dataset:{},style:{},textContent:'',classList:{toggle:()=>{}},setAttribute:()=>{},append:()=>{},remove:()=>{}});
 vi.stubGlobal('window',{matchMedia:()=>({matches:false}),devicePixelRatio:1});vi.stubGlobal('document',{createElement:element});vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
 try{
  const host={...element(),clientWidth:900,clientHeight:600};const state=createGame();const renderer=new ToyRenderer(host as unknown as HTMLElement,state);renderer.render(state,100);startGame(state,true);renderer.render(state,150);
  for(const height of [30,12]){applyTuning(state,{fieldHeight:height});renderer.render(state,200+height,true);expect(renderer.scene.getObjectByName('entry-tunnel')!.position.z).toBe(12);expect((host.dataset as Record<string,string>).entryAnchorHeight).toBe('20');}
  state.phase='playing';delete state.entrance;renderer.render(state,400);expect(renderer.scene.getObjectByName('entry-tunnel')!.position.z).toBe(8);expect((host.dataset as Record<string,string>).entryAnchorHeight).toBe('12');renderer.dispose();
 }finally{vi.unstubAllGlobals();}
});

it('does not redraw unchanged ready or paused scenes but invalidates on geometry or state changes',()=>{
 const element=()=>({className:'',dataset:{},style:{},textContent:'',classList:{toggle:()=>{}},setAttribute:()=>{},append:()=>{},remove:()=>{}});
 vi.stubGlobal('window',{matchMedia:()=>({matches:false}),devicePixelRatio:1});vi.stubGlobal('document',{createElement:element});vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
 try{
  const host={...element(),clientWidth:900,clientHeight:600};const state=createGame();const renderer=new ToyRenderer(host as unknown as HTMLElement,state);const paint=vi.spyOn(renderer.renderer,'render');
  renderer.render(state,100);renderer.render(state,150);renderer.render(state,200);expect(paint).toHaveBeenCalledTimes(1);
  state.phase='playing';renderer.render(state,250);renderer.render(state,300);expect(paint).toHaveBeenCalledTimes(3);
  renderer.render(state,350,true);renderer.render(state,400,true);expect(paint).toHaveBeenCalledTimes(4);
  state.tuning={...DEFAULT_TUNING,goalWidth:8};renderer.render(state,450,true);expect(paint).toHaveBeenCalledTimes(5);
  renderer.render(createGame(),500);expect(paint).toHaveBeenCalledTimes(6);renderer.dispose();
 }finally{vi.unstubAllGlobals();}
});
