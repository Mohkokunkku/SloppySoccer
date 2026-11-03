import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createGame } from '../shared/engine';
import { createFigure, poseFigure } from './scene';
import { TEAMS } from './teams';

const cast = [
  { id: 'A1', name: 'Matchday Athlete', role: 'attacker' },
  { id: 'A2', name: 'Power Captain', role: 'defender' },
  { id: 'A3', name: 'Midfield Runner', role: 'midfielder' },
] as const;
type CharacterId = typeof cast[number]['id'];
type Focus = 'all' | CharacterId;
type View = 'front' | 'threequarter' | 'back';
const angles: Record<View, number> = { front: 0, threequarter: -Math.PI / 6, back: Math.PI };
const viewNames: Record<View, string> = { front: 'Front', threequarter: 'Three-quarter', back: 'Back' };

const host = document.querySelector<HTMLElement>('#squad-canvas')!;
const status = document.querySelector<HTMLElement>('#squad-status')!;
const focusSelect = document.querySelector<HTMLSelectElement>('#showcase-focus')!;
const viewButtons = [...document.querySelectorAll<HTMLButtonElement>('button[data-view]')];
const inspectButtons = [...document.querySelectorAll<HTMLButtonElement>('button[data-focus]')];
const cards = [...document.querySelectorAll<HTMLElement>('.squad-card[data-character]')];

function startShowcase(): void {
  let view: View = 'threequarter';
  let focus: Focus = 'all';
  status.dataset.view = view;
  status.dataset.focus = focus;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0xe6e8d9);
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-describedby', 'focus-hint squad-status');
  host.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-6, 6, 3, -3, 0.1, 80);
  scene.add(new THREE.HemisphereLight(0xfff6df, 0x81927c, 2.6));
  const key = new THREE.DirectionalLight(0xfff2d8, 3.4);
  key.position.set(-4, 9, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.normalBias = 0.025;
  key.shadow.bias = -0.00015;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe4efff, 1.3);
  fill.position.set(5, 5, -6);
  scene.add(fill);

  const oak = new THREE.MeshStandardMaterial({ color: 0xc89f70, roughness: 0.62 });
  const green = new THREE.MeshStandardMaterial({ color: 0x39765b, roughness: 0.82 });
  const ivory = new THREE.MeshPhysicalMaterial({ color: 0xfff3d6, roughness: 0.4, clearcoat: 0.3 });
  const gold = new THREE.MeshStandardMaterial({ color: TEAMS.home.secondary, roughness: 0.4 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xe6e8d9, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.65;
  floor.receiveShadow = true;
  scene.add(floor);

  function roundedBlock(width: number, height: number, depth: number, material: THREE.Material, y: number): THREE.Mesh {
    const block = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 3, Math.min(0.14, height / 3)), material);
    block.position.y = y;
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);
    return block;
  }
  roundedBlock(12.4, 0.42, 3.5, oak, -0.36).name = 'oak-display-shelf';
  roundedBlock(12.1, 0.12, 3.25, green, -0.1).name = 'green-shelf-inset';
  const inlay = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.035, 0.025), gold);
  inlay.position.set(0, -0.25, 1.755);
  scene.add(inlay);

  // Use the same players, indices, factory and pose contract as the match.
  // No athletic factory import here: dispatch belongs to the runtime scene.
  const state = createGame();
  const figures = cast.map((identity, slot) => {
    const source = state.players.find(player => player.team === 'home' && player.role === 'outfield' && player.tacticalRole === identity.role);
    if (!source) throw new Error(`Missing Spain ${identity.role}`);
    const player = { ...source, x: (slot - 1) * 3.7, y: 0, vx: 0, vy: 0, facing: Math.PI / 2 };
    const rig = createFigure(player, state.players.indexOf(source));
    poseFigure(rig, player, 0, true);
    // Seat the unchanged runtime geometry on its display stand, whatever its height.
    rig.root.updateMatrixWorld(true);
    const feet = new THREE.Box3().setFromObject(rig.root).min.y;
    rig.root.position.y += 0.12 - feet;
    const group = new THREE.Group();
    group.name = `squad-${identity.id}`;
    group.add(rig.root);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.3, 0.17, 64), ivory);
    pedestal.position.set(player.x, 0.025, 0);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    group.add(pedestal);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.305, 1.305, 0.035, 64), gold);
    rim.position.set(player.x, -0.04, 0);
    rim.receiveShadow = true;
    group.add(rim);
    scene.add(group);
    return { ...identity, rig, group };
  });

  function render(): void {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    const bounds = new THREE.Box3();
    for (const figure of figures) {
      figure.group.visible = focus === 'all' || focus === figure.id;
      figure.rig.root.rotation.y = angles[view];
      figure.group.updateMatrixWorld(true);
      if (figure.group.visible) bounds.union(new THREE.Box3().setFromObject(figure.group));
    }
    const target = bounds.getCenter(new THREE.Vector3());
    camera.position.copy(target).add(new THREE.Vector3(0, 2.6, 15));
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
    // Fit projected world bounds, not a hard-coded desktop zoom. Every view
    // retains boots/headroom; focus fills the phone canvas with one full figure.
    let extentX = 0;
    let extentY = 0;
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          const corner = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
          extentX = Math.max(extentX, Math.abs(corner.x));
          extentY = Math.max(extentY, Math.abs(corner.y));
        }
      }
    }
    const aspect = width / height;
    const halfHeight = Math.max(extentY * 1.25, extentX * 1.14 / aspect, 1.9);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  function update(): void {
    for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.view === view));
    for (const card of cards) card.classList.toggle('is-focused', card.dataset.character === focus);
    for (const button of inspectButtons) button.setAttribute('aria-pressed', String(button.dataset.focus === focus));
    focusSelect.value = focus;
    status.dataset.view = view;
    status.dataset.focus = focus;
    const chosen = figures.find(figure => figure.id === focus);
    const subject = chosen ? `${chosen.id} ${chosen.name}, ${chosen.role}` : 'Spain squad: A1 attacker, A2 defender, A3 midfielder';
    status.textContent = `${subject}. ${viewNames[view]} view.`;
    canvas.setAttribute('aria-label', `3D ${subject}. ${viewNames[view]} view. Spain red and gold kits on an oak display shelf.`);
    render();
  }

  function setFocus(value: string): void {
    if (value !== 'all' && !cast.some(identity => identity.id === value)) return;
    focus = value as Focus;
    update();
  }
  viewButtons.forEach(button => button.addEventListener('click', () => {
    const value = button.dataset.view;
    if (value !== 'front' && value !== 'threequarter' && value !== 'back') return;
    view = value;
    update();
  }));
  focusSelect.addEventListener('change', () => setFocus(focusSelect.value));
  inspectButtons.forEach(button => button.addEventListener('click', () => {
    setFocus(button.dataset.focus ?? 'all');
    focusSelect.focus({ preventScroll: true });
    host.scrollIntoView({ block: 'center', behavior: 'instant' });
  }));

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    delete status.dataset.ready;
    status.classList.add('is-error');
    status.textContent = 'The 3D display was interrupted. Reload this page to restore the squad.';
  });
  const observer = new ResizeObserver(() => render());
  observer.observe(host);
  update();
  host.setAttribute('aria-busy', 'false');
  status.dataset.ready = 'true';

  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    observer.disconnect();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    key.shadow.map?.dispose();
    renderer.dispose();
  });
}

try {
  startShowcase();
} catch (error) {
  host.setAttribute('aria-busy', 'false');
  delete status.dataset.ready;
  status.classList.add('is-error');
  status.textContent = 'The 3D shelf could not start. Try reloading in a WebGL-enabled browser. You can still read every player’s name and role below.';
  focusSelect.disabled = true;
  [...viewButtons, ...inspectButtons].forEach(button => { button.disabled = true; });
  console.error('Squad preview could not start:', error);
}
