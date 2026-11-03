import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FIELD, type Player } from '../shared/types';
import {TEAMS} from './teams';
import {celebrationPose} from './celebrations';
import {characterIdFor} from './character-id';
import {createAthleticFigure} from './athletic-figures';

export const COLORS = { coral: TEAMS.home.primary, cobalt: TEAMS.away.primary, green: 0x39765b, ivory: 0xf8f3e6, charcoal: 0x252c2d, oak: 0xc89f70 };
const plastic = (color: THREE.ColorRepresentation, roughness = 0.34) => new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.3 });
const ivory = plastic(COLORS.ivory);
const black = plastic(0x20272a, 0.26);
const mark = new THREE.MeshBasicMaterial({ color: 0xf3f1d8, transparent: true, opacity: 0.87, depthWrite: false });
const rounded = (w: number, h: number, d: number, radius = 0.12) => new RoundedBoxGeometry(w, h, d, 2, radius);
const sphere = new THREE.SphereGeometry(1, 16, 12);

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Mesh {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true; object.receiveShadow = true;
  parent.add(object);
  return object;
}
function ellipsoid(parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number): THREE.Mesh {
  const object = mesh(sphere, material, parent, x, y, z); object.scale.set(sx, sy, sz); return object;
}
function bar(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material): void {
  const direction = b.clone().sub(a);
  const object = mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 8), material, parent);
  object.position.copy(a).add(b).multiplyScalar(0.5);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
}

export function cameraBounds(aspect: number): { width: number; height: number } {
  const safeAspect = Math.max(0.1, aspect);
  const height = Math.max(29, 43 / safeAspect);
  return { width: height * safeAspect, height };
}

function woodTexture(): THREE.DataTexture {
  const width = 512, height = 256;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const grain = Math.sin(y * 0.52 + Math.sin(x * 0.017) * 2.1) * 3 + Math.sin(y * 2.8 + x * 0.004) * 1.8;
    const plank = y % 64 < 1 ? -11 : 0;
    const i = (y * width + x) * 4;
    pixels[i] = 193 + grain + plank; pixels[i + 1] = 149 + grain + plank; pixels[i + 2] = 102 + grain + plank; pixels[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, width, height);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2); texture.needsUpdate = true;
  return texture;
}

export function shadowTexture(): THREE.DataTexture {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const r = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5);
    const i = (y * size + x) * 4;
    data[i] = 17; data[i + 1] = 34; data[i + 2] = 23;
    data[i + 3] = Math.max(0, (1 - r) ** 3) * 150;
    if (r >= 1) data[i + 3] = 0;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.needsUpdate = true; return texture;
}

function goal(side: -1 | 1): THREE.Group {
  const group = new THREE.Group(); group.name = side === -1 ? 'goal-home' : 'goal-away'; group.position.x = side * FIELD.width / 2;
  const depth = FIELD.goalDepth * side, half = FIELD.goalWidth / 2, height = 2.8;
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  for (const z of [-half, half]) {
    bar(group, v(0, 0, z), v(0, height, z), 0.105, ivory);
    bar(group, v(depth, 0, z), v(depth, height, z), 0.07, ivory);
    bar(group, v(0, height, z), v(depth, height, z), 0.08, ivory);
    bar(group, v(0, 0.06, z), v(depth, 0.06, z), 0.07, ivory);
  }
  bar(group, v(0, height, -half), v(0, height, half), 0.105, ivory);
  bar(group, v(depth, height, -half), v(depth, height, half), 0.07, ivory);
  bar(group, v(depth, 0.06, -half), v(depth, 0.06, half), 0.07, ivory);
  const segments: Array<[number, number, number, number, number, number]> = [];
  // Rigid square lattice, not a cloth net: back, roof and both sides.
  for (let z = -half; z <= half + 0.01; z += 0.5) {
    segments.push([depth, height / 2, z, 0.045, height, 0.045]);
    segments.push([depth / 2, height, z, FIELD.goalDepth, 0.045, 0.045]);
  }
  for (let y = 0.4; y < height; y += 0.4) {
    segments.push([depth, y, 0, 0.045, 0.045, FIELD.goalWidth]);
    for (const z of [-half, half]) segments.push([depth / 2, y, z, FIELD.goalDepth, 0.045, 0.045]);
  }
  for (let x = 0.4; x < FIELD.goalDepth; x += 0.4) {
    segments.push([side * x, height, 0, 0.045, 0.045, FIELD.goalWidth]);
    for (const z of [-half, half]) segments.push([side * x, height / 2, z, 0.045, height, 0.045]);
  }
  const lattice = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), ivory, segments.length);
  lattice.name = 'lattice'; lattice.receiveShadow = true;
  const dummy = new THREE.Object3D();
  segments.forEach(([x, y, z, w, h, d], index) => {
    dummy.position.set(x, y, z); dummy.scale.set(w, h, d); dummy.updateMatrix(); lattice.setMatrixAt(index, dummy.matrix);
  });
  group.add(lattice); return group;
}

export function buildTabletop(): THREE.Group {
  const root = new THREE.Group(); root.name = 'tabletop';
  const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.64, color: 0xffffff });
  const plinth = mesh(rounded(39.4, 1.25, 26.8, 0.32), wood, root, 0, -0.79, 0);
  plinth.name = 'oak-plinth';
  mesh(rounded(38.6, 0.25, 26.1, 0.12), plastic(0x9a6d41, 0.62), root, 0, -1.42, 0);
  const surround = mesh(rounded(35.7, 0.19, 23.3, 0.11), plastic(0x254c3b, 0.7), root, 0, -0.08, 0);
  surround.name = 'green-surround';
  const pitch = mesh(new THREE.PlaneGeometry(32, 20), new THREE.MeshStandardMaterial({ color: COLORS.green, roughness: 0.94 }), root, 0, 0.025, 0);
  pitch.name = 'pitch'; pitch.rotation.x = -Math.PI / 2; pitch.castShadow = false;
  const stripeMaterial = new THREE.MeshStandardMaterial({ color: 0x428363, roughness: 1 });
  for (let i = 0; i < 8; i += 2) {
    const stripe = mesh(new THREE.PlaneGeometry(4, 20), stripeMaterial, root, -14 + i * 4, 0.03, 0);
    stripe.rotation.x = -Math.PI / 2; stripe.castShadow = false;
  }
  const lines: THREE.BufferGeometry[] = [];
  function line(x: number, z: number, w: number, d: number): void {
    const geometry = new THREE.PlaneGeometry(w, d); geometry.rotateX(-Math.PI / 2); geometry.translate(x, 0.045, z); lines.push(geometry);
  }
  function rectangle(cx: number, cz: number, w: number, d: number): void {
    line(cx, cz - d / 2, w, 0.075); line(cx, cz + d / 2, w, 0.075);
    line(cx - w / 2, cz, 0.075, d); line(cx + w / 2, cz, 0.075, d);
  }
  rectangle(0, 0, 31.7, 19.7); line(0, 0, 0.075, 19.7);
  for (const side of [-1, 1]) { rectangle(side * 13.45, 0, 4.8, 10.8); rectangle(side * 14.95, 0, 1.8, 6.8); }
  const markings = mesh(mergeGeometries(lines), mark, root); markings.castShadow = false;
  lines.forEach(geometry => geometry.dispose());
  const circle = mesh(new THREE.RingGeometry(2.67, 2.75, 80), mark, root, 0, 0.048, 0); circle.rotation.x = -Math.PI / 2; circle.castShadow = false;
  for (const x of [-11.5, 0, 11.5]) {
    const spot = mesh(new THREE.CircleGeometry(0.12, 16), mark, root, x, 0.049, 0); spot.rotation.x = -Math.PI / 2; spot.castShadow = false;
  }
  root.add(goal(-1), goal(1));
  // Ivory corner pegs and a tiny colour inlay make the board a physical object.
  for (const x of [-16.25, 16.25]) for (const z of [-10.25, 10.25]) {
    const peg = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 8), ivory, root, x, 0.38, z);
    mesh(new THREE.BoxGeometry(0.45, 0.27, 0.025), plastic(x < 0 ? COLORS.coral : COLORS.cobalt), peg, 0.2, 0.23, 0);
    const country=x<0?'home':'away';
    const flag=new THREE.Group();flag.name='flag-'+country;peg.add(flag);
    TEAMS[country].flag.forEach((color,index)=>mesh(new THREE.BoxGeometry(0.72,index===1&&country==='home'?0.2:0.15,0.035),plastic(color),flag,0.36,0.4-index*0.15,0.02));
    if(country==='away')ellipsoid(flag,plastic(0xe4b548),0.36,0.25,0.045,0.055,0.055,0.015);
  }
  for (const x of [-17.5, 17.5]) {
    const inlay = mesh(rounded(0.65, 0.03, 3.5, 0.06), plastic(x < 0 ? COLORS.coral : COLORS.cobalt), root, x, -0.13, 7.7);
    inlay.castShadow = false;
  }
  return root;
}

export interface FigureRig { root: THREE.Group; body: THREE.Group; legs: THREE.Group[]; arms: THREE.Group[] }
export function createFigure(player: Player, index: number): FigureRig {
  const characterId=characterIdFor(player.team,player.role,player.tacticalRole);
  if(characterId)return createAthleticFigure(player,index,characterId);
  const root = new THREE.Group(); root.name = `player-${player.id}`;
  const body = new THREE.Group(); root.add(body);
  const keeper = player.role === 'keeper';
  const country=TEAMS[player.team];
  const kit = plastic(keeper ? country.keeper : player.team === 'home' ? country.primary : country.secondary);
  const shorts = plastic(keeper ? 0x202426 : country.shorts);
  const skin = plastic([0xe7b58a, 0xbd8258, 0xf1c7a0, 0x8f593b][index % 4], 0.57);
  const hair = plastic(index % 3 === 1 ? 0x503121 : 0x342c27, 0.58);
  const shirt = mesh(rounded(0.91, 0.78, 0.55, 0.16), kit, body, 0, 1.37, 0); shirt.name = 'jersey';
  if(!keeper&&player.team==='away')for(const x of [-0.3,0,0.3])for(const z of [-0.285,0.285]){const stripe=mesh(new THREE.BoxGeometry(0.13,0.65,0.018),plastic(country.primary),body,x,1.37,z);stripe.name='argentina-stripe';}
  mesh(rounded(0.56, 0.07, 0.57, 0.03), plastic(player.team==='home'?TEAMS.home.secondary:TEAMS.away.primary), body, 0, 1.72, 0);
  mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.16, 12), skin, body, 0, 1.83, 0);
  const face = ellipsoid(body, skin, 0, 2.11, 0.01, 0.3, 0.37, 0.3); face.name = 'face';
  const hairCap = mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.53), hair, body, 0, 2.19, -0.02);
  hairCap.scale.set(0.31, 0.31, 0.305); hairCap.name = 'hair';
  for (let i = -2; i <= 2; i++) {
    const comb = ellipsoid(body, hair, i * 0.09, 2.4 - Math.abs(i) * 0.027, 0.02, 0.035, 0.047, 0.18); comb.rotation.y = -0.2;
  }
  for (const side of [-1, 1]) {
    ellipsoid(body, skin, side * 0.3, 2.1, 0, 0.06, 0.1, 0.075);
    ellipsoid(body, black, side * 0.105, 2.13, 0.282, 0.027, 0.034, 0.018);
    const brow = mesh(new THREE.BoxGeometry(0.082, 0.018, 0.018), hair, body, side * 0.11, 2.205, 0.275); brow.rotation.z = side * 0.08;
  }
  ellipsoid(body, skin, 0, 2.065, 0.302, 0.06, 0.07, 0.065);
  const smile = mesh(new THREE.TorusGeometry(0.068, 0.011, 4, 12, Math.PI), black, body, 0, 2.005, 0.284); smile.rotation.z = Math.PI;
  // A raised chest badge and seam, like a tiny injection-moulded kit.
  mesh(rounded(0.12, 0.15, 0.022, 0.02), plastic(player.team==='home'?TEAMS.home.secondary:0xe4b548), body, -0.22, 1.49, 0.305);
  mesh(new THREE.BoxGeometry(0.025, 0.55, 0.014), kit, body, 0, 1.36, -0.283);
  const legs: THREE.Group[] = [], arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * 0.25, 1.05, 0); body.add(leg); legs.push(leg);
    mesh(rounded(0.4, 0.38, 0.47, 0.09), shorts, leg, 0, -0.11, 0);
    mesh(new THREE.CapsuleGeometry(0.125, 0.24, 3, 8), skin, leg, 0, -0.43, 0);
    mesh(new THREE.CapsuleGeometry(0.14, 0.29, 3, 10), black, leg, 0, -0.73, 0.015);
    const boot = mesh(rounded(0.31, 0.2, 0.54, 0.08), black, leg, 0, -0.94, 0.12); boot.name = side < 0 ? 'boot-left' : 'boot-right';
    mesh(new THREE.BoxGeometry(0.22, 0.04, 0.38), black, leg, 0, -1.025, 0.1);
    for (let lace = 0; lace < 2; lace++) mesh(new THREE.BoxGeometry(0.13, 0.015, 0.02), ivory, leg, 0, -0.835, 0.17 + lace * 0.07);
    const arm = new THREE.Group(); arm.position.set(side * 0.48, 1.64, 0); arm.rotation.z = side * (keeper ? 0.94 : 0.26); body.add(arm); arms.push(arm);
    mesh(new THREE.CapsuleGeometry(0.15, 0.22, 3, 8), kit, arm, 0, -0.14, 0);
    mesh(new THREE.CapsuleGeometry(0.105, 0.27, 3, 8), keeper ? kit : skin, arm, 0, -0.46, 0.025);
    ellipsoid(arm, keeper ? ivory : skin, 0, -0.66, 0.05, keeper ? 0.145 : 0.12, 0.15, 0.12);
  }
  return { root, body, legs, arms };
}

export function poseFigure(rig: FigureRig, player: Player, elapsed: number, reducedMotion: boolean, cheer?:{style:number;seconds:number;index:number}): void {
  rig.root.position.set(player.x, 0.1, player.y);
  rig.root.rotation.y = Math.PI / 2 - player.facing;
  const speed = Math.min(1, Math.hypot(player.vx, player.vy) / 4);
  const wave = reducedMotion ? 0 : Math.sin(elapsed * 14 + player.x * 0.16 + player.y * 0.11) * speed;
  rig.body.rotation.z = wave * 0.075;
  rig.body.position.y = Math.abs(wave) * 0.07;
  rig.legs[0].rotation.x = wave * 0.48; rig.legs[1].rotation.x = -wave * 0.48;
  rig.arms[0].rotation.x = -wave * 0.4; rig.arms[1].rotation.x = wave * 0.4;
  rig.arms.forEach((arm,index)=>{arm.rotation.z=(index===0?-1:1)*(player.role==='keeper'?0.94:0.26);});
  if(cheer){
    const pose=celebrationPose(cheer.style,cheer.seconds,cheer.index,reducedMotion);
    rig.root.position.y+=pose.hop;rig.root.position.x+=pose.side;rig.root.rotation.y+=pose.yaw;
    rig.body.rotation.z=pose.roll;rig.body.position.y=0;
    rig.arms[0].rotation.z=pose.leftArm;rig.arms[1].rotation.z=pose.rightArm;
    rig.arms[0].rotation.x=rig.arms[1].rotation.x=0;
    rig.legs[0].rotation.x=pose.leftLeg;rig.legs[1].rotation.x=pose.rightLeg;
  }
}

export function createFootball(): THREE.Group {
  const root = new THREE.Group(); root.name = 'football';
  mesh(new THREE.SphereGeometry(FIELD.ballRadius, 24, 18), plastic(0xfff9e9, 0.55), root);
  const patches = new THREE.Group(); patches.name = 'black-patches'; root.add(patches);
  const phi = (1 + Math.sqrt(5)) / 2;
  const directions = [
    [0, 1, phi], [0, -1, phi], [0, 1, -phi], [0, -1, -phi],
    [1, phi, 0], [-1, phi, 0], [1, -phi, 0], [-1, -phi, 0],
    [phi, 0, 1], [phi, 0, -1], [-phi, 0, 1], [-phi, 0, -1],
  ];
  directions.forEach(([x, y, z]) => {
    const normal = new THREE.Vector3(x, y, z).normalize();
    const patch = mesh(new THREE.CircleGeometry(0.088, 5), black, patches);
    patch.position.copy(normal).multiplyScalar(FIELD.ballRadius * 1.005);
    patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  });
  return root;
}
