import './argentina-model-gallery.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ARGENTINA_CANDIDATES,createArgentinaCandidate,disposeArgentinaCandidate,type ArgentinaCandidateId} from './argentina-candidate-models';
import {emptyLineup,toggleCandidate,restoreLineup,lineupReady,selectionText,type AuditionLineup} from './argentina-lineup';
import {createGame} from '../shared/engine';
import {createFigure,disposeTabletop,type FigureRig} from './scene';

const query=<T extends Element>(selector:string)=>document.querySelector<T>(selector)!;
const status=query<HTMLElement>('#gallery-status'),host=query<HTMLElement>('#model-viewer'),grid=query<HTMLElement>('#candidate-grid');
const name=query<HTMLElement>('#inspector-name'),details=query<HTMLElement>('#inspector-details');
const storageKey='sloppySoccer.argentinaAudition.v1';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
type View='front'|'threequarter'|'profile'|'back';
type Pose='idle'|'run'|'ready';
const angles:Record<View,number>={front:0,threequarter:.42,profile:Math.PI/2,back:Math.PI};
let chosen:ArgentinaCandidateId='P01',view:View='threequarter',pose:Pose='idle',comparison='none',faceMode=false;
let lineup:AuditionLineup=emptyLineup();
try{lineup=restoreLineup(JSON.parse(localStorage.getItem(storageKey)||'null'));}catch{/* Browser storage is optional; draft works without it. */}

function updateDraft(notice=''):void{
 query<HTMLElement>('#selection-summary').textContent=`${lineup.outfield.length} of 4 outfield players · ${lineup.keeper?1:0} of 1 goalkeeper${lineup.outfield.length?' — '+lineup.outfield.join(', '):''}${lineup.keeper?' + '+lineup.keeper:''}`;
 query<HTMLTextAreaElement>('#selection-output').value=selectionText(lineup);
 query<HTMLButtonElement>('#copy-lineup').disabled=!lineupReady(lineup);
 if(notice)query<HTMLElement>('#selection-notice').textContent=notice;
 for(const article of grid.querySelectorAll<HTMLElement>('[data-candidate-id]')){
  const id=article.dataset.candidateId!;const selected=lineup.outfield.includes(id)||lineup.keeper===id;
  article.dataset.picked=String(selected);const button=article.querySelector<HTMLButtonElement>('[data-pick]')!;
  button.setAttribute('aria-pressed',String(selected));button.textContent=selected?'Remove choice':id.startsWith('K')?'Choose keeper':'Choose player';button.setAttribute('aria-label',`${selected?'Remove':'Choose'} ${id} ${ARGENTINA_CANDIDATES.find(candidate=>candidate.id===id)?.name||id}`);
  article.querySelector<HTMLElement>('.picked-stamp')!.hidden=!selected;
 }
 query<HTMLButtonElement>('#pick-inspected').textContent=(lineup.outfield.includes(chosen)||lineup.keeper===chosen)?'Remove this choice':chosen.startsWith('K')?'Choose this keeper':'Choose this player';
}
function pick(id:string):void{const result=toggleCandidate(lineup,id);lineup=result.lineup;let notice=result.notice;if(result.changed)try{localStorage.setItem(storageKey,JSON.stringify(lineup));}catch{notice='Draft is available below. Browser storage is unavailable; copy your choices before leaving.';}updateDraft(notice);}
query<HTMLButtonElement>('#clear-lineup').addEventListener('click',()=>{lineup=emptyLineup();try{localStorage.removeItem(storageKey);}catch{/* Optional persistence. */}updateDraft('Choices cleared. The match squad has not changed.');});
query<HTMLButtonElement>('#copy-lineup').addEventListener('click',async()=>{if(!lineupReady(lineup))return;try{await navigator.clipboard.writeText(selectionText(lineup));query<HTMLElement>('#selection-notice').textContent='Lineup copied. Paste it into your reply to confirm your picks.';}catch{const output=query<HTMLTextAreaElement>('#selection-output');output.focus();output.select();query<HTMLElement>('#selection-notice').textContent='Select and copy the text below; automatic clipboard access is unavailable.';}});
function light(scene:THREE.Scene):void{
 scene.add(new THREE.HemisphereLight(0xfff7e9,0x8298a0,2.0));
 const key=new THREE.DirectionalLight(0xfff2df,3.2);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=5;key.shadow.camera.bottom=-3;key.shadow.normalBias=.025;scene.add(key);
 const fill=new THREE.DirectionalLight(0xcce9ff,1.0);fill.position.set(4,3,-3);scene.add(fill);
}
function makeRenderer():THREE.WebGLRenderer{const r=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});r.setPixelRatio(Math.min(devicePixelRatio||1,1.5));r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.05;r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;return r;}
function floor(scene:THREE.Scene):THREE.Mesh{
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(1.28,1.32,.09,48),new THREE.MeshStandardMaterial({color:0xc89f70,roughness:.68}));mesh.position.y=-.07;mesh.receiveShadow=true;scene.add(mesh);return mesh;
}
function disposeDisplay(root:THREE.Object3D):void{
 const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
 root.traverse(object=>{if(object instanceof THREE.Mesh){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);}});
 geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
}
function seatRig(rig:FigureRig):FigureRig{rig.root.updateMatrixWorld(true);rig.root.position.y-=new THREE.Box3().setFromObject(rig.root).min.y;return rig;}
function attachRest(rig:FigureRig):Map<THREE.Object3D,THREE.Euler>{return new Map([rig.body,...rig.legs,...rig.arms,...rig.knees||[],...rig.elbows||[]].map(object=>[object,object.rotation.clone()]));}
function applyPose(rig:FigureRig,rest:Map<THREE.Object3D,THREE.Euler>,wave:number):void{
 rest.forEach((rotation,object)=>object.rotation.copy(rotation));rig.body.position.y=0;
 if(pose==='run'){rig.body.rotation.x=-.10;rig.body.position.y=Math.abs(wave)*.035;rig.legs.forEach((leg,i)=>leg.rotation.x+=(i===0?1:-1)*wave*.55);rig.arms.forEach((arm,i)=>arm.rotation.x+=(i===0?-1:1)*wave*.45);rig.elbows?.forEach(elbow=>elbow.rotation.x=-.55);rig.knees?.forEach((knee,i)=>knee.rotation.x=Math.max(0,i===0?wave:-wave)*.7);}
 if(pose==='ready'){rig.body.rotation.x=-.06;rig.body.position.y=-.04;rig.legs.forEach((leg,i)=>leg.rotation.z+=(i===0?-1:1)*.07);rig.arms.forEach((arm,i)=>{arm.rotation.z=(i===0?-1:1)*.65;arm.rotation.x=-.25;});rig.elbows?.forEach(elbow=>elbow.rotation.x=-.35);rig.knees?.forEach(knee=>knee.rotation.x=.18);}
}
async function start():Promise<void>{
 const renderer=makeRenderer();renderer.setClearColor(0xe2eced);renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('tabindex','0');host.append(renderer.domElement);
 const scene=new THREE.Scene();light(scene);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0xe2eced,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.12;ground.receiveShadow=true;scene.add(ground);
 const camera=new THREE.OrthographicCamera(-2,2,2,-2,.1,80);const controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.minZoom=.65;controls.maxZoom=2.5;controls.minPolarAngle=Math.PI/5;controls.maxPolarAngle=Math.PI*.54;controls.enableDamping=false;
 let rig=seatRig(createArgentinaCandidate(chosen)),rest=attachRest(rig),reference:FigureRig|undefined,referenceRest:Map<THREE.Object3D,THREE.Euler>|undefined;scene.add(rig.root);
 let animation=0,disposed=false;const stands=[floor(scene),floor(scene)];stands[1].visible=false;
 function render(now=0):void{if(disposed)return;const wave=reduced.matches ? .7 : Math.sin(now/1000*8);applyPose(rig,rest,wave);if(reference&&referenceRest)applyPose(reference,referenceRest,wave);renderer.render(scene,camera);}
 function stopAnimation():void{cancelAnimationFrame(animation);animation=0;}
 function animate(now:number):void{render(now);if(pose==='run'&&!reduced.matches&&!document.hidden&&!disposed)animation=requestAnimationFrame(animate);else animation=0;}
 function schedule():void{stopAnimation();render(performance.now());if(pose==='run'&&!reduced.matches&&!document.hidden)animation=requestAnimationFrame(animate);}
 function fit():void{
  const width=Math.max(host.clientWidth,1),height=Math.max(host.clientHeight,1);renderer.setSize(width,height,false);
  const angle=angles[view];const offset=comparison==='none'?0:.95;
  rig.root.position.set(-offset*Math.cos(angle),rig.root.position.y,offset*Math.sin(angle));stands[0].position.set(rig.root.position.x,-.07,rig.root.position.z);
  if(reference){reference.root.position.set(offset*Math.cos(angle),reference.root.position.y,-offset*Math.sin(angle));stands[1].position.set(reference.root.position.x,-.07,reference.root.position.z);}
  const bounds=new THREE.Box3().setFromObject(rig.root);if(reference)bounds.union(new THREE.Box3().setFromObject(reference.root));const center=bounds.getCenter(new THREE.Vector3());
  if(faceMode)center.y=bounds.max.y-.34;
  controls.target.copy(center);camera.position.set(center.x+Math.sin(angle)*8,center.y+(faceMode ? .16 : 1.0),center.z+Math.cos(angle)*8);camera.lookAt(center);camera.updateMatrixWorld(true);
  let extentX=0,extentY=0;for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const corner=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);extentX=Math.max(extentX,Math.abs(corner.x));extentY=Math.max(extentY,Math.abs(corner.y));}
  const half=faceMode?Math.max(.64,comparison==='none'?0:extentX*1.05/(width/height)):Math.max(extentY*1.15,extentX*1.15/(width/height),1.95);camera.left=-half*width/height;camera.right=half*width/height;camera.top=half;camera.bottom=-half;camera.zoom=1;camera.updateProjectionMatrix();controls.update();render(performance.now());
 }
 function describe():void{
  const model=ARGENTINA_CANDIDATES.find(c=>c.id===chosen)!;name.textContent=`${model.id} ${model.name}`;details.textContent=`${model.description} ${model.build}. ${model.face}. ${model.hair}.`;
  status.dataset.selected=chosen;status.dataset.view=view;status.dataset.pose=pose;status.dataset.comparison=comparison;status.dataset.closeup=String(faceMode);
  status.textContent=`${chosen} ${model.name} · ${view==='threequarter'?'Three-quarter':view} view${comparison==='none'?'':comparison==='spain'?' · Argentina left / Spain right':' · New Argentina left / current Argentina right'}.`;
  renderer.domElement.setAttribute('aria-label',`3D adult Argentina candidate ${chosen} ${model.name}, ${view} view, ${pose} pose${comparison==='none'?'':', compared at the same world scale'}`);
  document.querySelectorAll<HTMLButtonElement>('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  document.querySelectorAll<HTMLButtonElement>('button[data-pose]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pose===pose)));
  query<HTMLButtonElement>('#face-detail').setAttribute('aria-pressed',String(faceMode));
  grid.querySelectorAll<HTMLElement>('[data-candidate-id]').forEach(article=>article.dataset.inspected=String(article.dataset.candidateId===chosen));updateDraft();
 }
 function rebuildReference():void{
  if(reference){scene.remove(reference.root);disposeTabletop(reference.root);reference=undefined;referenceRest=undefined;}
  rig.root.position.x=comparison==='none'?0:-.95;stands[0].position.x=rig.root.position.x;stands[1].visible=comparison!=='none';stands[1].position.x=.95;
  if(comparison!=='none'){const state=createGame();const source=state.players.find(p=>comparison==='spain'?p.team==='home'&&p.role==='outfield'&&p.tacticalRole==='defender':p.team==='away'&&p.role==='outfield')!;reference=seatRig(createFigure(source,state.players.indexOf(source)));reference.root.position.x=.95;referenceRest=attachRest(reference);scene.add(reference.root);}
 }
 function inspect(id:ArgentinaCandidateId):void{if(chosen!==id){scene.remove(rig.root);disposeArgentinaCandidate(rig);chosen=id;rig=seatRig(createArgentinaCandidate(id));rest=attachRest(rig);scene.add(rig.root);rebuildReference();}describe();fit();schedule();}
 controls.addEventListener('change',()=>render(performance.now()));
 document.querySelectorAll<HTMLButtonElement>('button[data-view]').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.view as View;faceMode=false;describe();fit();}));
 query<HTMLButtonElement>('#face-detail').addEventListener('click',()=>{faceMode=!faceMode;describe();fit();});
 document.querySelectorAll<HTMLButtonElement>('button[data-pose]').forEach(button=>button.addEventListener('click',()=>{pose=button.dataset.pose as Pose;describe();fit();schedule();}));
 query<HTMLSelectElement>('#compare-model').addEventListener('change',event=>{comparison=(event.target as HTMLSelectElement).value;rebuildReference();describe();fit();schedule();});
 query<HTMLButtonElement>('#pick-inspected').addEventListener('click',()=>pick(chosen));
 const thumbRenderer=makeRenderer();thumbRenderer.setPixelRatio(1);thumbRenderer.setSize(400,500,false);thumbRenderer.setClearColor(0xe0eaf0);const thumbScene=new THREE.Scene();light(thumbScene);floor(thumbScene);const thumbCamera=new THREE.OrthographicCamera(-1.55,1.55,1.94,-1.94,.1,30);thumbCamera.position.set(1.6,2.5,7);thumbCamera.lookAt(0,1.65,0);
 for(const candidate of ARGENTINA_CANDIDATES){
  const model=seatRig(createArgentinaCandidate(candidate.id));thumbScene.add(model.root);thumbRenderer.render(thumbScene,thumbCamera);
  const article=document.createElement('article');article.className='candidate'+(candidate.role==='keeper'?' keeper':'');article.dataset.candidateId=candidate.id;
  const portrait=document.createElement('div');portrait.className='candidate-portrait';const img=document.createElement('img');img.alt=`${candidate.id} ${candidate.name}, full-body ${candidate.role} model in Argentina kit`;img.width=400;img.height=500;img.src=thumbRenderer.domElement.toDataURL('image/png');
  const id=document.createElement('span');id.className='candidate-id';id.textContent=candidate.id;const stamp=document.createElement('span');stamp.className='picked-stamp';stamp.textContent='Shortlisted';stamp.hidden=true;portrait.append(img,id,stamp);
  const heading=document.createElement('h3');heading.textContent=candidate.name;const text=document.createElement('p');text.textContent=`${candidate.role==='keeper'?'Goalkeeper':'Outfield'} · ${candidate.build}`;
  const buttons=document.createElement('div');buttons.className='button-row';const inspectButton=document.createElement('button');inspectButton.type='button';inspectButton.dataset.inspect=candidate.id;inspectButton.textContent='Inspect';inspectButton.setAttribute('aria-label',`Inspect ${candidate.id} ${candidate.name}`);inspectButton.addEventListener('click',()=>{inspect(candidate.id);host.scrollIntoView({block:'start',behavior:'instant'});});
  const pickButton=document.createElement('button');pickButton.type='button';pickButton.dataset.pick=candidate.id;pickButton.setAttribute('aria-label',`Choose ${candidate.id} ${candidate.name}`);pickButton.addEventListener('click',()=>pick(candidate.id));buttons.append(inspectButton,pickButton);article.append(portrait,heading,text,buttons);grid.append(article);
  await img.decode();thumbScene.remove(model.root);disposeArgentinaCandidate(model);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
 }
 disposeDisplay(thumbScene);thumbRenderer.dispose();thumbRenderer.forceContextLoss();
 const resize=new ResizeObserver(fit);resize.observe(host);const visibility=()=>document.hidden?stopAnimation():schedule();document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',schedule);
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();stopAnimation();delete status.dataset.ready;document.body.classList.add('is-error');status.textContent='The 3D display was interrupted. Reload this page to restore the auditions.';});
 describe();fit();status.dataset.ready='true';host.setAttribute('aria-busy','false');grid.setAttribute('aria-busy','false');query<HTMLButtonElement>('#pick-inspected').disabled=false;
 window.addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;stopAnimation();resize.disconnect();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',schedule);controls.dispose();scene.remove(rig.root);disposeArgentinaCandidate(rig);if(reference){scene.remove(reference.root);disposeTabletop(reference.root);}disposeDisplay(scene);renderer.dispose();renderer.forceContextLoss();},{once:true});
}
updateDraft();
start().catch(()=>{delete status.dataset.ready;document.body.classList.add('is-error');status.textContent='The 3D gallery could not load. Enable WebGL and reload this page; the match squad is unchanged.';host.setAttribute('aria-busy','false');grid.setAttribute('aria-busy','false');const message=document.createElement('p');message.textContent='3D preview unavailable. Please enable hardware acceleration or use a WebGL-capable browser.';host.replaceChildren(message);});
