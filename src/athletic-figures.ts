import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Player } from '../shared/types';
import type { FigureRig } from './scene';
import { TEAMS } from './teams';

type CharacterId = 'A1' | 'A2' | 'A3';
const plastic = (color: number, roughness = 0.38) => new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: 0.38, clearcoatRoughness: 0.28 });
const kit = plastic(TEAMS.home.primary), gold = plastic(TEAMS.home.secondary);
const shorts = plastic(TEAMS.home.shorts), black = plastic(0x20272a, 0.27);
const ivory = plastic(0xfffdf5), hairMaterial = plastic(0x302923, 0.56);
const sphere = new THREE.SphereGeometry(1, 16, 12);
const up = new THREE.Vector3(0, 1, 0);
function part(parent: THREE.Object3D, name: string, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name; mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
function oval(parent: THREE.Object3D, name: string, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number): THREE.Mesh {
  const mesh = part(parent, name, sphere, material, x, y, z); mesh.scale.set(sx, sy, sz); return mesh;
}
function box(parent: THREE.Object3D, name: string, material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, radius = 0.035): THREE.Mesh {
  return part(parent, name, new RoundedBoxGeometry(w, h, d, 2, radius), material, x, y, z);
}
function link(parent: THREE.Object3D, name: string, material: THREE.Material, a: number[], b: number[], radius: number, endRadius = radius): THREE.Mesh {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
  const mesh = part(parent, name, new THREE.CylinderGeometry(endRadius, radius, direction.length(), 10), material, 0, 0, 0);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(up, direction.normalize()); return mesh;
}

/** Adult toy mould: +Z is the face; hip/shoulder pivots match poseFigure. */
export function createAthleticFigure(player: Player, index: number, characterId: CharacterId): FigureRig {
  const captain = characterId === 'A2';
  const runner = characterId === 'A3';
  const width = captain ? 1.30 : runner ? 0.94 : 1;
  const bulk = captain ? 1.18 : 1;
  const depth = captain ? 0.72 : 0.63;
  const root = new THREE.Group(); root.name = `player-${player.id}`;
  root.userData = { characterId, displayName: captain ? 'Power Captain' : runner ? 'Midfield Runner' : 'Matchday Athlete', markerHeight: 3.5 };
  const body = new THREE.Group(); body.name = 'athletic-body'; root.add(body);
  const skin = plastic([0xe3a66e, 0xbd8258, 0xd69b68, 0x8f593b][((index % 4) + 4) % 4], 0.48);
  const torso = new THREE.LatheGeometry([
    new THREE.Vector2(0.31, -0.47), new THREE.Vector2(0.34, -0.43),
    new THREE.Vector2(0.33, -0.23), new THREE.Vector2(0.37, 0.06),
    new THREE.Vector2(0.43, 0.31), new THREE.Vector2(0.40, 0.40),
    new THREE.Vector2(0.23, 0.47), new THREE.Vector2(0, 0.47),
  ], 20);
  torso.scale(width, 1, depth);
  part(body, 'jersey', torso, kit, 0, 1.98, 0);
  box(body, 'waist-hem', kit, 0, 1.53, 0, 0.64 * width, 0.07, captain ? 0.47 : 0.42);
  part(body, 'neck', new THREE.CylinderGeometry(0.125 * bulk, 0.15 * bulk, 0.19, 12), skin, 0, 2.48, 0);
  for (const side of [-1, 1]) {
    link(body, 'v-neck', gold, [0, 2.29, depth * 0.445], [side * 0.19, 2.43, 0.19], 0.035);
    link(body, 'side-seam', gold, [side * 0.30 * width, 1.60, 0.13], [side * 0.36 * width, 2.14, 0.15], 0.008);
  }
  box(body, 'chest-crest', gold, -0.19 * width, 2.15, depth * 0.38, 0.10, 0.13, 0.025, 0.016);
  box(body, 'crest-inlay', kit, -0.19 * width, 2.16, depth * 0.38 + 0.019, 0.034, 0.07, 0.012, 0.004);
  box(body, 'back-mould-seam', kit, 0, 1.98, -depth * 0.38, 0.012, 0.65, 0.018, 0.005);
  // A firm chin, small adult cranium and raised features, never a printed face.
  oval(body, 'face', skin, 0, 2.77, 0, captain ? 0.251 : 0.231, 0.282, 0.224);
  box(body, 'jaw', skin, 0, 2.63, 0.025, captain ? 0.40 : 0.32, 0.18, 0.31, captain ? 0.045 : 0.065);
  if (captain) {
    // A close, wraparound beard: cheeks and chin, with exposed mouth above it.
    const beard = new THREE.Group(); beard.name = 'beard'; body.add(beard);
    box(beard, 'beard-chin', hairMaterial, 0, 2.575, 0.055, 0.34, 0.09, 0.31, 0.035);
    for (const side of [-1, 1]) {
      const cheek = box(beard, 'beard-cheek', hairMaterial, side * 0.178, 2.641, 0.097, 0.07, 0.17, 0.20, 0.025);
      cheek.rotation.z = -side * 0.22;
    }
    box(beard, 'moustache', hairMaterial, 0, 2.674, 0.226, 0.13, 0.028, 0.021, 0.009);
  }
  const hair = part(body, 'hair', new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.49), hairMaterial, 0, 2.84, -0.018);
  hair.scale.set(0.24, 0.23, 0.232);
  for (const side of [-1, 1]) {
    oval(body, 'ear', skin, side * 0.233, 2.77, 0, 0.044, 0.073, 0.052);
    oval(body, 'eye', black, side * 0.085, 2.785, 0.211, 0.017, 0.021, 0.012);
    const brow = box(body, 'brow', hairMaterial, side * 0.086, 2.841, 0.212, 0.066, 0.015, 0.017, 0.006); brow.rotation.z = side * 0.12;
    oval(body, 'cropped-side', hairMaterial, side * 0.214, 2.86, -0.04, 0.022, 0.092, 0.129);
  }
  oval(body, 'nose', skin, 0, 2.736, 0.232, 0.036, 0.05, 0.042);
  box(body, 'mouth', hairMaterial, 0, 2.654, 0.197, 0.075, 0.012, 0.013, 0.005);
  if (runner) {
    // Raised, deterministic curls are real geometry, readable from every view.
    const texture = new THREE.Group(); texture.name = 'hair-texture'; body.add(texture);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 7; i++) {
      const angle = i / 7 * Math.PI * 2 + row * 0.38;
      const radius = 0.17 - row * 0.055;
      oval(texture, 'curl', hairMaterial, Math.cos(angle) * radius, 3.012 + row * 0.027, Math.sin(angle) * radius - 0.018, 0.049, 0.045, 0.05);
    }
    const band = part(body, 'headband', new THREE.CylinderGeometry(0.244, 0.244, 0.074, 24, 1, true), ivory, 0, 2.89, -0.015);
    band.scale.z = 0.99;
    box(body, 'headband-knot', ivory, 0.12, 2.88, -0.24, 0.105, 0.095, 0.06, 0.022);
    for (const side of [-1, 1]) {
      const tail = box(body, 'headband-tail', ivory, 0.12 + side * 0.045, 2.77, -0.25, 0.04, 0.18, 0.022, 0.009);
      tail.rotation.z = side * 0.28;
    }
  } else for (let i = 0; i < 5; i++) {
    const ridge = oval(body, 'crop-ridge', hairMaterial, (i - 2) * 0.075, 3.035 - Math.abs(i - 2) * 0.022, -0.01, 0.023, captain ? 0.042 : 0.025, 0.12);
    ridge.rotation.y = captain ? -0.6 : -0.32;
  }
  const legs: THREE.Group[] = [], arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.name = side < 0 ? 'leg-left' : 'leg-right'; leg.position.set(side * (captain ? 0.26 : 0.205), 1.48, 0); body.add(leg); legs.push(leg);
    box(leg, 'shorts', shorts, 0, -0.15, 0, 0.35, 0.39, 0.42, 0.065);
    link(leg, 'thigh', skin, [0, -0.30, 0], [0, -0.75, 0.055], 0.123 * bulk, 0.10 * bulk);
    oval(leg, 'knee', skin, 0, -0.73, 0.055, 0.105, 0.11, 0.113);
    link(leg, 'calf', skin, [0, -0.72, 0.05], [0, -1.13, 0], 0.10, 0.079);
    part(leg, 'sock', new THREE.CylinderGeometry(0.101, 0.086, 0.33, 12), kit, 0, -1.10, 0.013);
    part(leg, 'sock-cuff', new THREE.CylinderGeometry(0.104, 0.104, 0.045, 12), gold, 0, -0.94, 0.013);
    box(leg, side < 0 ? 'boot-left' : 'boot-right', black, 0, -1.35, 0.102, 0.27, 0.21, 0.46, 0.065);
    box(leg, 'boot-sole', black, 0, -1.445, 0.105, 0.28, 0.045, 0.47, 0.015);
    for (let lace = 0; lace < 3; lace++) box(leg, 'lace', ivory, 0, -1.242, 0.095 + lace * 0.05, 0.10, 0.012, 0.014, 0.003);
    const arm = new THREE.Group(); arm.name = side < 0 ? 'arm-left' : 'arm-right'; arm.position.set(side * 0.41 * width, 2.30, 0); arm.rotation.z = side * 0.26; body.add(arm); arms.push(arm);
    part(arm, 'sleeve', new THREE.CapsuleGeometry(0.139 * bulk, 0.16, 3, 10), kit, 0, -0.13, 0);
    part(arm, 'sleeve-cuff', new THREE.CylinderGeometry(0.14 * bulk, 0.14 * bulk, 0.045, 12), gold, 0, -0.265, 0);
    if (captain && side < 0) part(arm, 'captain-armband', new THREE.CylinderGeometry(0.167, 0.167, 0.085, 12), ivory, 0, -0.19, 0);
    link(arm, 'upper-arm', skin, [0, -0.28, 0], [0, -0.48, 0.035], 0.095, 0.087);
    oval(arm, 'elbow', skin, 0, -0.48, 0.035, 0.09, 0.095, 0.09);
    link(arm, 'forearm', skin, [0, -0.48, 0.035], [-side * 0.035, -0.69, 0.17], 0.087, 0.064);
    oval(arm, 'hand', skin, -side * 0.035, -0.735, 0.20, 0.082, 0.10, 0.085);
    oval(arm, 'thumb', skin, -side * 0.092, -0.72, 0.24, 0.034, 0.05, 0.039);
    if (runner && side > 0) link(arm, 'wrist-tape', ivory, [-0.029, -0.648, 0.144], [-0.036, -0.695, 0.175], 0.073);
  }
  return { root, body, legs, arms };
}
