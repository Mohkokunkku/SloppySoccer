import * as THREE from 'three';
import { FIELD, type GameState } from '../shared/types';
import {roleMarker} from './role-marker';
import {tacticalRoleOf} from '../shared/tactics';
import {celebrationStyle} from './celebrations';
import {TEAMS} from './teams';
import { buildTabletop, cameraBounds, COLORS, createFigure, createFootball, poseFigure, shadowTexture, type FigureRig } from './scene';

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
  private observer: ResizeObserver;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private lastRender = 0;
  private motionTime=0;
  private labels=document.createElement('div');
  private markers=new Map<string,HTMLSpanElement>();
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
    this.scene.add(buildTabletop());
    const shadowMap = shadowTexture();
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, opacity: 0.8 });
    state.players.forEach((player, index) => {
      const rig = createFigure(player, index); this.figures.set(player.id, rig); this.scene.add(rig.root);
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), shadowMaterial);
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.06;
      this.shadows.set(player.id, shadow); this.scene.add(shadow);
    });
    this.ballShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), shadowMaterial.clone());
    this.ballShadow.rotation.x = -Math.PI / 2; this.ballShadow.position.y = 0.065; this.scene.add(this.ballShadow, this.ball);
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
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize();
  }

  private resize(): void {
    const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height);
    const bounds = cameraBounds(width / height);
    this.camera.left = -bounds.width / 2; this.camera.right = bounds.width / 2;
    this.camera.top = bounds.height / 2; this.camera.bottom = -bounds.height / 2;
    this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
  }

  start(frame: (now: number) => void): void {
    this.renderer.setAnimationLoop(now => frame(now));
  }

  render(state: GameState, now: number, paused=false): void {
    const dt = Math.min(0.05, Math.max(0, (now - this.lastRender) / 1000)); this.lastRender = now;
    if(!paused&&(state.phase==='playing'||state.phase==='resetting'))this.motionTime+=dt;
    state.players.forEach((player,index) => {
      const rig = this.figures.get(player.id);
      const cheer=state.phase==='goal'&&state.lastScorer===player.team?{style:celebrationStyle(state.score.home+state.score.away),seconds:5-state.phaseTimer,index:index%4}:undefined;
      if (rig) poseFigure(rig, player, this.motionTime, this.reducedMotion.matches,cheer);
      const marker=this.markers.get(player.id);
      if(marker){
        const label=roleMarker(player.role==='keeper'?'keeper':tacticalRoleOf(player)??undefined);if(marker.textContent!==label)marker.textContent=label;
        marker.dataset.role=label;marker.classList.toggle('is-controlled',player.id===state.controlledId);
        marker.dataset.character=typeof rig?.root.userData.characterId==='string'?rig.root.userData.characterId:'';
        const markerHeight=typeof rig?.root.userData.markerHeight==='number'?rig.root.userData.markerHeight:2.95;
        this.projected.set(rig?.root.position.x??player.x,(rig?.root.position.y??0.1)+markerHeight,player.y).project(this.camera);
        const x=(this.projected.x+1)*this.host.clientWidth/2,y=(1-this.projected.y)*this.host.clientHeight/2;
        marker.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
      }
      const shadow = this.shadows.get(player.id); shadow?.position.set(player.x, 0.061, player.y);
    });
    const controlled = state.players.find(player => player.id === state.controlledId);
    this.selection.visible = Boolean(controlled);
    if (controlled) this.selection.position.set(controlled.x, 0.075, controlled.y);
    const ball = state.ball;
    this.ball.position.set(ball.x, Math.max(0, ball.z) + FIELD.ballRadius + 0.08, ball.y);
    this.ball.rotation.x += ball.vy * dt / FIELD.ballRadius;
    this.ball.rotation.z -= ball.vx * dt / FIELD.ballRadius;
    this.ballShadow.position.set(ball.x, 0.064, ball.y);
    this.ballShadow.scale.setScalar(1 + Math.max(0, ball.z) * 0.4);
    (this.ballShadow.material as THREE.MeshBasicMaterial).opacity = 0.9 / (1 + Math.max(0, ball.z) * 0.65);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null); this.observer.disconnect();
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
      }
    });
    this.labels.remove();this.markers.clear();
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
