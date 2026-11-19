import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { FigureRig } from './scene';

export type ArgentinaCandidateId = 'P01'|'P02'|'P03'|'P04'|'P05'|'P06'|'P07'|'P08'|'P09'|'P10'|'K01'|'K02';
export interface ArgentinaCandidate { id: ArgentinaCandidateId; name: string; role: 'outfield'|'keeper'; build: string; hair: string; face: string; description: string }
const rows: [ArgentinaCandidateId,string,'outfield'|'keeper',string,string,string,string][] = [
 ['P01','Anchor','outfield','broad athletic','close crop','square jaw','Broad clean-cropped anchor.'],['P02','Playmaker','outfield','slim tapered','side part','fine angular','Slim side-part playmaker.'],['P03','Striker','outfield','tall powerful','short crop','long angular','Tall cropped striker.'],['P04','Veteran','outfield','compact sturdy','shaven','deep brow','Compact shaven veteran.'],['P05','Winger','outfield','lean springy','tight curls','soft cheekbones','Lean curly winger.'],['P06','Engine','outfield','medium athletic','swept back','firm chin','Swept-back midfield engine.'],['P07','Enforcer','outfield','heavy muscular','buzz cut','broad jaw','Heavy buzz-cut enforcer.'],['P08','Technician','outfield','lean long-limbed','tied-back','narrow chin','Lean tied-back technician.'],['P09','Sweeper','outfield','rangy athletic','wavy','arched brows','Wavy-haired sweeper.'],['P10','Poacher','outfield','compact quick','angular fringe','pointed chin','Angular-fringe poacher.'],['K01','Keeper One','keeper','tall lean','close crop','strong brow','Tall charcoal keeper.'],['K02','Keeper Two','keeper','broad powerful','dark curls','square chin','Broad green keeper.']
];
export const ARGENTINA_CANDIDATES: readonly ArgentinaCandidate[] = Object.freeze(rows.map(([id,name,role,build,hair,face,description])=>Object.freeze({id,name,role,build,hair,face,description})));
const skinColors=[0xc38b68,0xd3a07b,0x9b6547,0xd8ad88,0xb67753,0xc58c67,0x87563e,0xd09a72,0xa96c4e,0xe0b18b,0xbe825b,0x905c40];
const hairColors=[0x29221e,0x392820,0x2d2723,0x342c28,0x201c1a,0x3c2b23,0x241e1b,0x30251f,0x392a24,0x241d1a,0x312720,0x211b18];
const heights=[3.18,3.25,3.48,3.12,3.30,3.26,3.36,3.40,3.32,3.16,3.46,3.40];
const mat=(color:number)=>new THREE.MeshPhysicalMaterial({color,roughness:.48,metalness:0,clearcoat:.22,clearcoatRoughness:.38});
function add(parent:THREE.Object3D,name:string,g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0):THREE.Mesh { const o=new THREE.Mesh(g,m);o.name=name;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o; }
function box(parent:THREE.Object3D,name:string,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,r=.03){return add(parent,name,new RoundedBoxGeometry(w,h,d,3,r),m,x,y,z);}
function ell(parent:THREE.Object3D,name:string,m:THREE.Material,x:number,y:number,z:number,a:number,b:number,c:number){const o=add(parent,name,new THREE.SphereGeometry(1,18,14),m,x,y,z);o.scale.set(a,b,c);return o;}
function link(parent:THREE.Object3D,name:string,m:THREE.Material,a:THREE.Vector3,b:THREE.Vector3,r:number,r2=r){const d=b.clone().sub(a);const o=add(parent,name,new THREE.CylinderGeometry(r2,r,d.length(),14),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());return o;}
function makeShirtTexture():THREE.DataTexture { const w=128,h=128,data=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const stripe=Math.floor(x/(w/7))%2===1;const i=(y*w+x)*4;data[i]=stripe?117:247;data[i+1]=stripe?183:248;data[i+2]=stripe?218:244;data[i+3]=255;}const t=new THREE.DataTexture(data,w,h,THREE.RGBAFormat);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearFilter;t.needsUpdate=true;return t;}
function hairStyle(body:THREE.Group,index:number,hair:THREE.Material,headW:number){
 if(index===1||index===5||index===8||index===9){const fringe=box(body,'hair-fringe',hair,0,2.94,.205,headW*1.58,.065,.08,.025);fringe.rotation.z=index===1?-.16:.08;}

 if(index===4||index===11){for(let n=0;n<11;n++){const a=n*Math.PI*2/11;ell(body,'curl',hair,Math.cos(a)*headW*.76,2.99+Math.sin(a)*.035,Math.sin(a)*headW*.58,.05,.052,.05);}}
 if(index===7){for(let n=0;n<5;n++)ell(body,'tied-hair',hair,0,2.82-n*.075,-.18-n*.028,.065,.07,.11);}
 if(index===6){for(let n=-2;n<=2;n++)ell(body,'buzz-texture',hair,n*.07,3.0,.07,.05,.036,.055);}
}
export function createArgentinaCandidate(id:ArgentinaCandidateId):FigureRig {
 const index=ARGENTINA_CANDIDATES.findIndex(x=>x.id===id);if(index<0)throw new Error(`Unknown Argentina candidate: ${String(id)}`);
 const s=ARGENTINA_CANDIDATES[index],keeper=s.role==='keeper',height=heights[index],broad=[0,6,11].includes(index),slim=[1,4,7,9].includes(index),width=broad?1.19:slim?.94:1.05;
 const root=new THREE.Group();root.name=`argentina-${id}`;root.userData.candidateId=id;const body=new THREE.Group();body.name='athletic-body';root.add(body);
 const skin=mat(skinColors[index]),hair=mat(hairColors[index]),navy=mat(0x172c3b),white=mat(0xf7f8f4),shirt=keeper?mat(index===10?0x303943:0x087349):new THREE.MeshPhysicalMaterial({map:makeShirtTexture(),roughness:.52,clearcoat:.2});
 const scale=height/3.3;body.scale.y=scale;body.scale.y*=1.1;
 const torso=new THREE.LatheGeometry([new THREE.Vector2(.29,0),new THREE.Vector2(.32,.12),new THREE.Vector2(.35,.38),new THREE.Vector2(.40,.65),new THREE.Vector2(.38,.82),new THREE.Vector2(.25,.94),new THREE.Vector2(0,.95)],28);torso.scale(width,1,keeper?.74:.68);torso.translate(0,1.48,0);
 const torsoPositions=torso.getAttribute('position'),uv=torso.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setX(i,torsoPositions.getX(i)/(.8*width)+.5);uv.needsUpdate=true;
 add(body,'jersey',torso,shirt);
 // Subtle raised seam piping frames the printed, wrapping fabric stripes without floating plates.
 for(const x of [-.32,.32])link(body,'shirt-seam',mat(keeper?0x476168:0xd8e5e6),new THREE.Vector3(x*width,1.58,.255),new THREE.Vector3(x*width*.78,2.28,.235),.009);
 box(body,'waist-hem',keeper?shirt:white,0,1.49,0,.67*width,.085,.47,.03);
 const neck=add(body,'neck',new THREE.CylinderGeometry(.105,.14,.20,18),skin,0,2.47,0);
 const headW=[.235,.21,.225,.245,.215,.23,.25,.21,.235,.215,.235,.25][index];
 // One continuous tapered cranium and lower jaw gives a firm face without a separate muzzle-like block.
 const headProfile=[new THREE.Vector2(0,-.28),new THREE.Vector2(.12,-.27),new THREE.Vector2(headW*.82,-.20),new THREE.Vector2(headW*.96,-.07),new THREE.Vector2(headW,.08),new THREE.Vector2(headW*.92,.22),new THREE.Vector2(headW*.62,.29),new THREE.Vector2(0,.30)];
 const faceG=new THREE.LatheGeometry(headProfile,32);faceG.scale(1,.88,.82);faceG.translate(0,2.75,.015);
 const facePositions=faceG.getAttribute('position'),faceColors:number[]=[],skinColor=new THREE.Color(skinColors[index]),hairColor=new THREE.Color(hairColors[index]);
 const hasBeard=[3,6,8].includes(index);
 for(let i=0;i<facePositions.count;i++){
   const x=facePositions.getX(i),y=facePositions.getY(i),z=facePositions.getZ(i);
   const scalp=y>2.93||(y>2.85&&z<-.045);
   const beard=hasBeard&&z>-.10&&(y<2.61||(y<2.70&&Math.abs(x)>.14));
   const color=scalp||beard?(index===3&&scalp?skinColor.clone().lerp(hairColor,.35):hairColor):skinColor;
   faceColors.push(color.r,color.g,color.b);
 }
 faceG.setAttribute('color',new THREE.Float32BufferAttribute(faceColors,3));
 const faceMaterial=mat(0xffffff);faceMaterial.vertexColors=true;add(body,'face',faceG,faceMaterial);
 const surface=(x:number,y:number):number=>{const localY=(y-2.75)/.88;let radius=0;for(let i=1;i<headProfile.length;i++){const a=headProfile[i-1],b=headProfile[i];if(localY>=a.y&&localY<=b.y){radius=a.x+(b.x-a.x)*(localY-a.y)/(b.y-a.y);break;}}return .015+.82*Math.sqrt(Math.max(0,radius*radius-x*x));};
 const noseZ=surface(0,2.765)+.018;ell(body,'nose',skin,0,2.765,noseZ,.026,.045,.03);
 const dark=mat(0x231d1a),eye=mat(0x171b1d);
 for(const side of [-1,1]){ell(body,'ear',skin,side*(headW+.008),2.76,.005,.038,.058,.045);ell(body,'eye',eye,side*.078,2.805,surface(side*.078,2.805)+.006,.027,.010,.009);link(body,'brow',hair,new THREE.Vector3(side*.045,2.85,surface(side*.045,2.85)+.008),new THREE.Vector3(side*.11,2.86,surface(side*.11,2.86)+.008),.012);ell(body,'nostril',dark,side*.018,2.744,noseZ+.022,.007,.005,.006);}
 link(body,'mouth',mat(0x603f35),new THREE.Vector3(-.036,2.625,surface(-.036,2.625)+.007),new THREE.Vector3(.036,2.625,surface(.036,2.625)+.007),.006);
 hairStyle(body,index,hair,headW);
 const legs:THREE.Group[]=[],arms:THREE.Group[]=[],knees:THREE.Group[]=[],elbows:THREE.Group[]=[];
 for(const side of [-1,1]){
   const hip=new THREE.Group();hip.name=side<0?'leg-left':'leg-right';hip.position.set(side*.205,1.45,0);body.add(hip);legs.push(hip);
   box(hip,'shorts',navy,0,-.12,0,.33,.31,.42,.045);
   link(hip,'thigh',skin,new THREE.Vector3(0,-.27,0),new THREE.Vector3(0,-.69,.025),.105,.085);
   const knee=new THREE.Group();knee.name='knee-pivot';knee.position.set(0,-.69,.025);hip.add(knee);knees.push(knee);ell(knee,'knee',skin,0,0,0,.085,.09,.09);
   link(knee,'calf',skin,new THREE.Vector3(0,0,0),new THREE.Vector3(0,-.38,-.015),.078,.06);
   add(knee,'sock',new THREE.CylinderGeometry(.074,.064,.33,14),white,0,-.40,0);
   box(knee,'boot',mat(0x20272a),0,-.60,.09,.24,.15,.39,.04);
   const shoulder=new THREE.Group();shoulder.name=side<0?'arm-left':'arm-right';shoulder.position.set(side*.40*width,2.27,0);shoulder.rotation.z=side*.12;body.add(shoulder);arms.push(shoulder);
   if(keeper)add(shoulder,'long-sleeve',new THREE.CapsuleGeometry(.105,.24,5,14),shirt,0,-.22,0);
   else add(shoulder,'sleeve',new THREE.CapsuleGeometry(.12,.13,4,12),white,0,-.10,0);
   link(shoulder,'upper-arm',skin,new THREE.Vector3(0,-.19,0),new THREE.Vector3(0,-.43,.015),.078,.068);
   const elbow=new THREE.Group();elbow.name='elbow-pivot';elbow.position.set(0,-.43,.015);shoulder.add(elbow);elbows.push(elbow);ell(elbow,'elbow',keeper?shirt:skin,0,0,0,keeper?.095:.068,keeper?.095:.07,keeper?.095:.07);
   link(elbow,'forearm',keeper?shirt:skin,new THREE.Vector3(0,0,0),new THREE.Vector3(0,-.27,.045),keeper?.085:.061,keeper?.062:.045);
   if(keeper){box(elbow,'glove-cuff',mat(0x75b7da),0,-.25,.045,.15,.06,.14,.02);const glove=box(elbow,'glove',mat(0x172c3b),0,-.32,.07,.16,.14,.10,.035);glove.scale.set(1.15,1.2,1.1);}
   else ell(elbow,'hand',skin,0,-.31,.06,.055,.068,.055);
 }
 root.updateMatrixWorld(true);return {root,body,legs,arms,knees,elbows};
}
export function disposeArgentinaCandidate(rig:FigureRig):void {const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();rig.root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>{for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.add(value);m.dispose();});textures.forEach(texture=>texture.dispose());}
