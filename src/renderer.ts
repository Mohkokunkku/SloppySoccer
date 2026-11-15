import * as THREE from 'three';
import { FIELD, type GameState } from '../shared/types';
import {getTuning,DEFAULT_TUNING} from '../shared/tuning';
import {advanceBallMotion,type BallMotion} from './ball-motion';
import {kickoffPosition} from '../shared/engine';
import {advanceLocomotion} from './locomotion';
import {roleMarker} from './role-marker';
import {roleChargeView} from './role-charge';
import './role-charge.css';
import {tacticalRoleOf} from '../shared/tactics';
import {celebrationStyle} from './celebrations';
import {humanControls} from '../shared/local-controls';
import {introCamera} from './cinematic';
import type {PostMatchView} from './post-match';
import {POST_MATCH_HANDSHAKE_AT} from './post-match';
import {handshakeLayout,poseHandshakePair} from './handshake';
import {TEAMS} from './teams';
import { buildTabletop, disposeTabletop, cameraBounds, COLORS, createFigure, createFootball, poseFigure, setFigureExpression, shadowTexture, type FigureRig } from './scene';
const SEAT_COLORS=[0xffe183,0x7ce9ff,0xff91d5,0xaaff8c];

/** Presentation only. shared/engine.ts is the sole owner of simulation. */
export class ToyRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-24, 24, 15, -15, 0.1, 150);
  private figures = new Map<string, FigureRig>();
  private shadows = new Map<string, THREE.Mesh>();
  private ball = createFootball();
  private ballShadow: THREE.Mesh;
  private selection: THREE.Group;
  private selections=new Map<string,THREE.Group>();
  private rigKeys=new Map<string,string>();
  private observer: ResizeObserver;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private lastRender = 0;
  private motionTime=0;
  private tuning={...DEFAULT_TUNING};
  private entryHeight=DEFAULT_TUNING.fieldHeight;
  private board:THREE.Group;
  private geometrySignature='';
  private boardRebuilds=0;
  private ballMotion?:BallMotion;
  private motionState:GameState|null=null;
  private needsFrame=true;
  private staticState:GameState|null=null;
  private staticKey='';
  private labels=document.createElement('div');
  private markers=new Map<string,HTMLSpanElement>();
  private seatBadges=new Map<string,HTMLSpanElement>();
  private projected=new THREE.Vector3();

  constructor(private host: HTMLElement, state: GameState) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setClearColor(0xece8dd);
    const canvas = this.renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Sloppy Soccer tabletop pitch. You control Spain and attack the right goal. Use WASD or arrow keys to move, Space to shoot, E to pass, Q to switch and Shift to sprint.');
    canvas.tabIndex = 0;
    host.append(canvas);
    this.labels.className='role-markers';this.labels.setAttribute('aria-label','Player tactical roles');host.append(this.labels);
    for(const player of state.players){const marker=document.createElement('span');marker.className='role-marker '+player.team;marker.dataset.player=player.id;marker.setAttribute('role','img');marker.setAttribute('aria-label',TEAMS[player.team].name+' '+(player.role==='keeper'?'goalkeeper':tacticalRoleOf(player)));this.labels.append(marker);this.markers.set(player.id,marker);}
    this.camera.position.set(3, 34, 29); this.camera.lookAt(0, -0.2, 0);
    this.scene.add(new THREE.HemisphereLight(0xfff6df, 0xa1b09d, 2.7));
    const key = new THREE.DirectionalLight(0xfff2d8, 3.4); key.position.set(-12, 25, 10);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -27; key.shadow.camera.right = 27; key.shadow.camera.top = 24; key.shadow.camera.bottom = -24;
    key.shadow.normalBias = 0.04; key.shadow.bias = -0.00015; key.shadow.radius = 4;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xe2e9ff, 1.4); fill.position.set(18, 12, -18); this.scene.add(fill);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xece8dd, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.58; floor.receiveShadow = true; this.scene.add(floor);
    this.tuning=getTuning(state);this.entryHeight=state.phase==='entering'?(state.entrance?.fieldHeight??this.tuning.fieldHeight):this.tuning.fieldHeight;this.geometrySignature=this.signature();
    this.board=buildTabletop(this.tuning,this.entryHeight);this.scene.add(this.board);
    const shadowMap = shadowTexture();
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, opacity: 0.8 });
    state.players.forEach((player, index) => {
      const rig = createFigure(player, index);rig.locomotion=advanceLocomotion(undefined,player.x,player.y,0,false,this.reducedMotion.matches); this.figures.set(player.id, rig); this.scene.add(rig.root);
      this.rigKeys.set(player.id,`${player.team}:${player.role}:${player.tacticalRole}`);
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), shadowMaterial.clone());
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.06;
      this.shadows.set(player.id, shadow); this.scene.add(shadow);
    });
    this.ballShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), shadowMaterial.clone());
    this.ballShadow.rotation.x = -Math.PI / 2; this.ballShadow.position.y = 0.065; this.scene.add(this.ballShadow, this.ball);
    shadowMaterial.dispose();
    this.selection = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.RingGeometry(0.79, 0.9, 48), new THREE.MeshBasicMaterial({ color: COLORS.ivory, side: THREE.DoubleSide }));
    outer.rotation.x = -Math.PI / 2;
    const inner = new THREE.Mesh(new THREE.RingGeometry(0.68, 0.79, 48), new THREE.MeshBasicMaterial({ color: 0xffe183, side: THREE.DoubleSide })); inner.rotation.x = -Math.PI / 2;
    const chevronShape = new THREE.Shape();
    chevronShape.moveTo(-0.25, 0.13); chevronShape.lineTo(0, -0.13); chevronShape.lineTo(0.25, 0.13);
    chevronShape.lineTo(0.25, 0.28); chevronShape.lineTo(0, 0.04); chevronShape.lineTo(-0.25, 0.28); chevronShape.closePath();
    const chevron = new THREE.Mesh(new THREE.ShapeGeometry(chevronShape), new THREE.MeshBasicMaterial({ color: 0xffe183, side: THREE.DoubleSide }));
    chevron.rotation.x = -Math.PI / 2; chevron.position.z = -1.1;
    this.selection.add(outer, inner, chevron); this.scene.add(this.selection);
    this.selection.visible=false;
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize();
  }

  private signature():string {return [this.tuning.fieldWidth,this.tuning.fieldHeight,this.tuning.goalWidth,this.tuning.goalHeight,this.entryHeight].join(':');}

  private release(root:THREE.Object3D):void {
    root.removeFromParent();root.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>material.dispose());}});
  }

  private syncFigures(state:GameState):void {
    for(const [id,rig] of this.figures)if(!state.players.some(p=>p.id===id)){this.release(rig.root);this.figures.delete(id);const shadow=this.shadows.get(id);if(shadow)this.release(shadow);this.shadows.delete(id);this.markers.get(id)?.remove();this.markers.delete(id);this.rigKeys.delete(id);}
    state.players.forEach((player,index)=>{
      const key=`${player.team}:${player.role}:${player.tacticalRole}`;
      if(this.rigKeys.get(player.id)!==key){
        const previous=this.figures.get(player.id);if(previous)this.release(previous.root);
        const rig=createFigure(player,index);rig.locomotion=advanceLocomotion(undefined,player.x,player.y,0,false,this.reducedMotion.matches);this.figures.set(player.id,rig);this.rigKeys.set(player.id,key);this.scene.add(rig.root);
      }
      if(!this.shadows.has(player.id)){const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.3,2.3),(this.ballShadow.material as THREE.MeshBasicMaterial).clone());shadow.rotation.x=-Math.PI/2;this.shadows.set(player.id,shadow);this.scene.add(shadow);}
      if(!this.markers.has(player.id)){const marker=document.createElement('span');marker.setAttribute('role','img');marker.dataset.player=player.id;this.labels.append(marker);this.markers.set(player.id,marker);}
      this.markers.get(player.id)!.className='role-marker '+player.team;
    });
  }

  private updateCamera(state:GameState):void {
    const size=(value:number)=>Number.isFinite(value)&&value>0?value:1;
    const bounds=cameraBounds(size(this.host.clientWidth)/size(this.host.clientHeight),this.tuning,this.entryHeight);
    const subject=(team:'home'|'away')=>{
      const player=state.players.find(p=>p.team===team&&p.role==='outfield');
      const root=player?this.figures.get(player.id)?.root:undefined;
      const face=root?.getObjectByName('face');root?.updateMatrixWorld(true);
      // Both moulds use a unit sphere scaled into a face; anchor its front
      // surface, not the cranium center behind the visible facial features.
      const point=face?.localToWorld(new THREE.Vector3(0,0,1));
      const fallback=root?.localToWorld(new THREE.Vector3(0,root.userData.characterId?2.77:2.11,root.userData.characterId ? .224 : .3));
      return {x:point?.x??fallback?.x??0,y:point?.y??fallback?.y??2.11,z:point?.z??fallback?.z??0,yaw:root?.rotation.y??0,faceHeight:0};
    };
    const home=subject('home'),away=subject('away');
    const progress=Math.max(0,Math.min(1,(5-state.phaseTimer)/1.5)),blend=progress*progress*(3-2*progress);
    // Blend both face anchors instead of cutting between cameras; shortest angular arc.
    const angle=Math.atan2(Math.sin(away.yaw-home.yaw),Math.cos(away.yaw-home.yaw));
    const target={x:home.x+(away.x-home.x)*blend,y:home.y+(away.y-home.y)*blend,z:home.z+(away.z-home.z)*blend,yaw:home.yaw+angle*blend,faceHeight:0};
    const camera=introCamera(state.phase==='intro'?state.phaseTimer:0,target,bounds,this.reducedMotion.matches);
    this.camera.position.set(camera.position.x,camera.position.y,camera.position.z);this.camera.lookAt(camera.target.x,camera.target.y,camera.target.z);
    this.camera.left=-camera.width/2;this.camera.right=camera.width/2;this.camera.top=camera.height/2;this.camera.bottom=-camera.height/2;this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
    this.host.dataset.cameraMode=camera.mode;
    this.host.dataset.introShot=state.phase!=='intro'?'wide':this.reducedMotion.matches?'teams':progress===0?'home':progress===1?'away':'transition';
  }

  private updatePartyCamera(state:GameState,view:PostMatchView,paused:boolean):void {
    Object.assign(this.host.dataset,{postMatchActive:String(view.active),postMatchTheme:String(view.theme),postMatchSegment:view.segment,postMatchWinner:view.winner??'draw',postMatchElapsed:view.elapsed.toFixed(3)});
    if(paused)return;
    const bounds=cameraBounds(Math.max(.1,this.host.clientWidth/Math.max(1,this.host.clientHeight)),this.tuning,this.entryHeight);
    const reduced=this.reducedMotion.matches,aspect=bounds.width/bounds.height;
    let width=bounds.width,height=bounds.height;
    if(!reduced&&(view.segment==='winners'||view.segment==='losers')){
      const roster=state.players.filter(p=>view.segment==='losers'?p.team!==view.winner:p.team===view.winner);
      const shot=view.segment==='losers'?view.elapsed-6:view.elapsed;
      const player=roster[Math.min(roster.length-1,Math.floor(shot/2))],rig=player?this.figures.get(player.id):undefined;
      const face=rig?.root.getObjectByName('face');rig?.root.updateMatrixWorld(true);
      const point=face?.localToWorld(new THREE.Vector3(0,0,1))??rig?.root.position.clone()??new THREE.Vector3();
      const yaw=(rig?.root.rotation.y??0)+.2+Math.sin(shot*.7)*.12;
      height=4.4+view.theme*.25;width=height*aspect;
      this.camera.position.set(point.x+Math.sin(yaw)*7,point.y+.8,point.z+Math.cos(yaw)*7);this.camera.lookAt(point);
    }else if(!reduced&&view.segment==='finale'){
      width=Math.min(bounds.width,24);height=width/aspect;
      const angle=view.elapsed*.18+view.theme*.6;
      this.camera.position.set(Math.sin(angle)*17,12,Math.cos(angle)*17);this.camera.lookAt(0,1,0);
    }else if(!reduced&&view.segment==='handshake'){
      const blend=THREE.MathUtils.smoothstep(view.elapsed-POST_MATCH_HANDSHAKE_AT,0,2),angle=POST_MATCH_HANDSHAKE_AT*.18+view.theme*.6;
      width=THREE.MathUtils.lerp(Math.min(bounds.width,24),Math.min(bounds.width,22),blend);height=width/aspect;
      this.camera.position.set(THREE.MathUtils.lerp(Math.sin(angle)*17,8,blend),THREE.MathUtils.lerp(12,18,blend),THREE.MathUtils.lerp(Math.cos(angle)*17,12,blend));this.camera.lookAt(0,THREE.MathUtils.lerp(1,1.3,blend),0);
    }else {this.camera.position.set(3,34,29);this.camera.lookAt(0,-.2,0);}
    this.camera.left=-width/2;this.camera.right=width/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();this.host.dataset.cameraMode=reduced?'wide':'post-match';
  }

  private resize(): void {
    this.needsFrame=true;
    const finiteSize=(value:number)=>Number.isFinite(value)&&value>0?value:1;
    const width = finiteSize(this.host.clientWidth), height = finiteSize(this.host.clientHeight);
    this.renderer.setSize(width, height);
    const bounds = cameraBounds(width / height,this.tuning,this.entryHeight);
    this.camera.left = -bounds.width / 2; this.camera.right = bounds.width / 2;
    this.camera.top = bounds.height / 2; this.camera.bottom = -bounds.height / 2;
    this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
  }

  start(frame: (now: number) => void): void {
    this.renderer.setAnimationLoop(now => frame(now));
  }

  render(state: GameState, now: number, paused=false, postMatch?:PostMatchView): void {
    const dt = Math.min(0.05, Math.max(0, (now - this.lastRender) / 1000)); this.lastRender = now;
    this.tuning=getTuning(state);
    this.entryHeight=state.phase==='entering'?(state.entrance?.fieldHeight??this.tuning.fieldHeight):this.tuning.fieldHeight;
    const geometryChanged=this.signature()!==this.geometrySignature;
    if(geometryChanged){
      this.scene.remove(this.board);disposeTabletop(this.board);this.board=buildTabletop(this.tuning,this.entryHeight);this.scene.add(this.board);
      this.geometrySignature=this.signature();this.boardRebuilds++;this.resize();

    }
    const party=Boolean(postMatch?.active&&state.phase==='finished');
    const greeting=party&&postMatch!.segment==='handshake'&&postMatch!.winner!==null;
    const greetingTime=greeting?postMatch!.elapsed-POST_MATCH_HANDSHAKE_AT:0;
    const greetingBlend=this.reducedMotion.matches?1:THREE.MathUtils.smoothstep(greetingTime,0,2);
    const pairs=greeting?handshakeLayout(state.players):[];
    const greetingTargets=new Map(pairs.flatMap(pair=>[[pair.homeId,pair.home],[pair.awayId,pair.away]] as const));
    const staticScene=paused||state.phase==='ready'||(state.phase==='finished'&&!party);
    const staticKey=JSON.stringify([state.phase,paused,this.reducedMotion.matches,state.formations,state.controls,state.controlledId,state.players.map(p=>[p.id,p.team,p.role,p.tacticalRole]),postMatch?.active,postMatch?.id,postMatch?.theme,postMatch?.segment]);
    if(staticScene&&!this.needsFrame&&this.staticState===state&&this.staticKey===staticKey)return;
    this.staticState=staticScene?state:null;this.staticKey=staticKey;this.needsFrame=false;
    if(this.motionState!==state||state.phase==='ready')this.motionTime=0;
    if(!paused&&(state.phase==='playing'||state.phase==='resetting'||state.phase==='entering'||state.phase==='intro'||party))this.motionTime+=dt;
    this.syncFigures(state);
    const controls=humanControls(state);
    for(const [seat,badge] of this.seatBadges)if(!controls.some(c=>c.seatId===seat&&this.markers.has(c.playerId))){badge.remove();this.seatBadges.delete(seat);}
    const positions:Record<string,{x:number;z:number}>={};
    state.players.forEach((player,index)=>{
      const rig=this.figures.get(player.id);
      const partyWinner=party&&postMatch!.winner===player.team;
      const partyLoser=party&&postMatch!.winner!==null&&postMatch!.winner!==player.team;
      const cheer=greeting&&greetingBlend===1?undefined:partyWinner?{style:celebrationStyle(postMatch!.theme+1),seconds:postMatch!.elapsed,index:(index+postMatch!.theme)%5}:state.phase==='intro'?{style:celebrationStyle(1),seconds:6.5-state.phaseTimer,index:index%5}:state.phase==='goal'&&state.lastScorer===player.team?{style:celebrationStyle(state.score.home+state.score.away),seconds:5-state.phaseTimer,index:index%5}:undefined;
      let posed=player;
      if(party&&!this.reducedMotion.matches&&postMatch!.winner){
        const i=state.players.filter(p=>p.team===player.team).findIndex(p=>p.id===player.id),theme=postMatch!.theme;
        const angle=i*Math.PI*2/5;
        const x=partyLoser?(postMatch!.winner==='home'?8:-8):theme===1?Math.cos(angle)*2.4:theme===2?Math.floor(i/3)*1.7-1:(i%2)*1.2-.6;
        const y=partyLoser?(i-2)*1.5:theme===1?Math.sin(angle)*2.4:theme===2?(i%3-1)*1.8:(i-2)*1.6;
        posed={...player,x,y,vx:0,vy:0,facing:player.team==='home'?0:Math.PI};
      }
      const target=greetingTargets.get(player.id);
      if(target)posed={...posed,x:THREE.MathUtils.lerp(posed.x,target.x,greetingBlend),y:THREE.MathUtils.lerp(posed.y,target.y,greetingBlend),vx:0,vy:0,facing:posed.facing+Math.atan2(Math.sin(target.facing-posed.facing),Math.cos(target.facing-posed.facing))*greetingBlend};
      if(rig&&!paused){
        poseFigure(rig,posed,this.motionTime,this.reducedMotion.matches,cheer);
        if(partyWinner)setFigureExpression(rig,'happy');else if(partyLoser){setFigureExpression(rig,'frustrated');if(!this.reducedMotion.matches){rig.body.rotation.x=-0.42;rig.body.rotation.z=0.08*Math.sin(this.motionTime*2);rig.arms[0].rotation.z=-0.08;rig.arms[1].rotation.z=0.08;}}
        if(target){
          setFigureExpression(rig,'happy');rig.root.position.x=THREE.MathUtils.lerp(rig.root.position.x,posed.x,greetingBlend);rig.root.position.z=THREE.MathUtils.lerp(rig.root.position.z,posed.y,greetingBlend);rig.root.position.y=.1+(rig.root.position.y-.1)*(1-greetingBlend);
          rig.root.rotation.y=THREE.MathUtils.lerp(rig.root.rotation.y,Math.PI/2-posed.facing,greetingBlend);rig.body.rotation.x*=1-greetingBlend;rig.body.rotation.z*=1-greetingBlend;rig.body.position.y*=1-greetingBlend;
          for(const leg of rig.legs)leg.rotation.x*=1-greetingBlend;for(const knee of rig.knees??[])knee.rotation.x*=1-greetingBlend;
        }
      }
      positions[player.id]={x:rig?.root.position.x??player.x,z:rig?.root.position.z??player.y};
    });
    if(greeting&&!paused){
      const contacts=[];
      if(greetingBlend===1)for(const pair of pairs){const home=this.figures.get(pair.homeId),away=this.figures.get(pair.awayId);if(home&&away){const hands=poseHandshakePair(home,away,greetingTime-2,this.reducedMotion.matches);contacts.push({homeId:pair.homeId,awayId:pair.awayId,handDistance:hands.homeHand.distanceTo(hands.awayHand),homeHand:hands.homeHand.toArray(),awayHand:hands.awayHand.toArray()});}}
      this.host.dataset.handshakePairs=JSON.stringify(contacts);this.host.dataset.handshakeStep=greetingBlend<1?'approach':'shake';
    }else if(!greeting){this.host.dataset.handshakePairs='[]';this.host.dataset.handshakeStep='';}
    if(party)this.updatePartyCamera(state,postMatch!,paused);else {this.updateCamera(state);Object.assign(this.host.dataset,{postMatchActive:'false',postMatchTheme:'',postMatchSegment:'',postMatchWinner:''});}
    state.players.forEach(player => {
      const rig = this.figures.get(player.id);
      const marker=this.markers.get(player.id);
      if(marker){
        const label=roleMarker(player.role==='keeper'?'keeper':tacticalRoleOf(player)??undefined);if(marker.textContent!==label)marker.textContent=label;
        const seat=controls.find(c=>c.playerId===player.id);
        marker.dataset.seat=seat?.seatId??'';
        const charge=roleChargeView(state,player.id);
        marker.dataset.charging=String(charge.charging);marker.dataset.chargePercent=charge.charging?String(charge.percent):'';
        marker.style.background=charge.background;marker.style.borderColor=charge.charging?charge.color:'';
        marker.style.color=charge.charging?'#132e3e':seat?`#${SEAT_COLORS[controls.indexOf(seat)%4].toString(16)}`:'';
        marker.setAttribute('aria-label',`${TEAMS[player.team].name} ${label}${seat?' '+seat.seatId:''}${charge.charging?`, shot power ${charge.percent} percent, release to kick`:''}`);
        marker.dataset.role=label;marker.classList.toggle('is-controlled',Boolean(seat));
        marker.dataset.character=typeof rig?.root.userData.characterId==='string'?rig.root.userData.characterId:'';
        const markerHeight=typeof rig?.root.userData.markerHeight==='number'?rig.root.userData.markerHeight:2.95;
        this.projected.set(rig?.root.position.x??player.x,(rig?.root.position.y??0.1)+markerHeight,rig?.root.position.z??player.y).project(this.camera);
        const x=(this.projected.x+1)*this.host.clientWidth/2,y=(1-this.projected.y)*this.host.clientHeight/2;
        marker.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
        if(seat){
          let badge=this.seatBadges.get(seat.seatId);
          if(!badge){
            badge=document.createElement('span');badge.className='seat-badge';badge.setAttribute('role','img');
            Object.assign(badge.style,{position:'absolute',left:'0',top:'0',padding:'2px 5px',borderRadius:'5px',background:'#173549',border:'1px solid currentColor',font:'bold 12px/1 Trebuchet MS, Arial, sans-serif',whiteSpace:'nowrap',pointerEvents:'none'});
            this.labels.append(badge);this.seatBadges.set(seat.seatId,badge);
          }
          badge.textContent=seat.seatId.toUpperCase();badge.dataset.seat=seat.seatId;badge.dataset.player=player.id;
          badge.style.color=`#${SEAT_COLORS[controls.indexOf(seat)%4].toString(16)}`;badge.style.transform=marker.style.transform+' translateY(-26px)';
          badge.setAttribute('aria-label',`${TEAMS[player.team].name} ${seat.seatId} controlled player ${label}`);
        }
      }
      const shadow = this.shadows.get(player.id); if(!paused)shadow?.position.set(positions[player.id].x, 0.061, positions[player.id].z);
    });

    for(const [seat,ring] of this.selections)if(!controls.some(c=>c.seatId===seat)){this.release(ring);this.selections.delete(seat);}
    controls.forEach((control,index)=>{
      let ring=this.selections.get(control.seatId);
      if(!ring){ring=this.selection.clone();ring.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry=object.geometry.clone();object.material=(object.material as THREE.MeshBasicMaterial).clone();}});this.scene.add(ring);this.selections.set(control.seatId,ring);}
      ring.traverse(object=>{if(object instanceof THREE.Mesh)(object.material as THREE.MeshBasicMaterial).color.setHex(SEAT_COLORS[index%4]);});
      ring.visible=true;const position=positions[control.playerId];if(position)ring.position.set(position.x,.075,position.z);
    });
    Object.assign(this.host.dataset,{controlledPlayers:JSON.stringify(Object.fromEntries(controls.map(c=>[c.seatId,c.playerId]))),playerPositions:JSON.stringify(positions),danceStyle:String(celebrationStyle(state.phase==='intro'?1:state.score.home+state.score.away))});
    const ball = state.ball;
    if(!paused)this.ball.position.set(ball.x, Math.max(0, ball.z) + FIELD.ballRadius + 0.08, ball.y);
    this.ballMotion=advanceBallMotion(this.ballMotion,ball.x,ball.y,state.phase,paused,this.reducedMotion.matches,geometryChanged||this.motionState!==state);
    this.motionState=state;
    this.ball.rotation.x=this.ballMotion.x;this.ball.rotation.z=this.ballMotion.z;
    if(!paused){
      this.ballShadow.position.set(ball.x, 0.064, ball.y);
      this.ballShadow.scale.setScalar(1 + Math.max(0, ball.z) * 0.4);
      (this.ballShadow.material as THREE.MeshBasicMaterial).opacity = 0.9 / (1 + Math.max(0, ball.z) * 0.65);
    }
    const enteringCount=state.phase==='entering'?state.players.filter(player=>{const target=kickoffPosition(player.team,Number(player.id.split('-')[1]),'home',this.tuning,state.formations);return Math.hypot(player.x-target.x,player.y-target.y)>.05;}).length:0;
    this.host.dataset.entryAnchorHeight=String(this.entryHeight);this.host.dataset.ballRelease=JSON.stringify(ball.release??null);
    Object.assign(this.host.dataset,{phase:state.phase,fieldWidth:String(this.tuning.fieldWidth),fieldHeight:String(this.tuning.fieldHeight),goalWidth:String(this.tuning.goalWidth),goalHeight:String(this.tuning.goalHeight),ballRotation:`${this.ball.rotation.x},${this.ball.rotation.y},${this.ball.rotation.z}`,ballPosition:`${ball.x},${ball.y},${ball.z}`,runPhase:String(this.figures.values().next().value?.locomotion?.phase??0),entryCount:String(enteringCount),boardRebuilds:String(this.boardRebuilds)});
    this.renderer.render(this.scene, this.camera);
    this.host.dataset.framesRendered=String(this.renderer.info?.render.frame??0);
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null); this.observer.disconnect();
    this.scene.remove(this.board);disposeTabletop(this.board);
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
      }
    });
    for(const badge of this.seatBadges.values())badge.remove();this.seatBadges.clear();
    this.labels.remove();this.markers.clear();
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
