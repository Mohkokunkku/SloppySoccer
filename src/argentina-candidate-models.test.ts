import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ARGENTINA_CANDIDATES, createArgentinaCandidate, disposeArgentinaCandidate } from './argentina-candidate-models';

describe('Argentina candidate casting', () => {
  it('exports twelve ordered adult candidates with distinct identity and roles', () => {
    expect(ARGENTINA_CANDIDATES.map(candidate => candidate.id)).toEqual(['P01','P02','P03','P04','P05','P06','P07','P08','P09','P10','K01','K02']);
    expect(ARGENTINA_CANDIDATES.filter(candidate => candidate.role === 'outfield')).toHaveLength(10);
    expect(ARGENTINA_CANDIDATES.filter(candidate => candidate.role === 'keeper')).toHaveLength(2);
    expect(new Set(ARGENTINA_CANDIDATES.map(candidate => candidate.name)).size).toBe(12);
  });
  it('creates finite, adult-proportioned, articulated, independently disposable figures', () => {
    const rigs = ARGENTINA_CANDIDATES.map(candidate => createArgentinaCandidate(candidate.id));
    try {
      const signatures = new Set<string>();
      for (const rig of rigs) {
        const bounds = new THREE.Box3().setFromObject(rig.root);
        const size = bounds.getSize(new THREE.Vector3());
        expect(rig.root.userData.candidateId).toBeTruthy();
        expect(size.y).toBeGreaterThan(3.0); expect(size.y).toBeLessThan(3.6);
        expect(bounds.min.y).toBeGreaterThanOrEqual(-0.02);
        expect(rig.legs).toHaveLength(2); expect(rig.arms).toHaveLength(2);
        expect(size.x).toBeGreaterThan(0.8); expect(size.x).toBeLessThan(1.6);
        const face = rig.root.getObjectByName('face') as THREE.Mesh;
        expect(face).toBeDefined();
        const headBounds=new THREE.Box3().setFromObject(face);
        expect(headBounds.min.y).toBeGreaterThan(bounds.max.y-size.y*.25);
        expect(headBounds.getSize(new THREE.Vector3()).y/size.y).toBeLessThanOrEqual(.18);
        const positions: ArrayLike<number>[] = [];
        rig.root.traverse(object => { if (object instanceof THREE.Mesh) positions.push(object.geometry.getAttribute('position').array); });
        expect(positions.every(attribute => Array.from(attribute).every(Number.isFinite))).toBe(true);
        const coordinateSamples: number[] = [];
        rig.root.traverse(object => { if (object instanceof THREE.Mesh) {
          const p = object.geometry.getAttribute('position');
          for (let i = 0; i < p.count; i += Math.max(1, Math.floor(p.count / 12))) coordinateSamples.push(Number(p.getX(i).toFixed(3)), Number(p.getY(i).toFixed(3)), Number(p.getZ(i).toFixed(3)));
        }});
        signatures.add(coordinateSamples.join(','));
      }
      expect(signatures.size).toBe(12);
      const height = (id: string) => new THREE.Box3().setFromObject(rigs.find(r => r.root.userData.candidateId === id)!.root).getSize(new THREE.Vector3()).y;
      expect(height('P03')).toBeGreaterThan(height('P01'));
      expect(height('K01')).toBeGreaterThan(height('P01'));
      const aGeometry = (rigs[0].root.children[0] as THREE.Group).children[0];
      const bGeometry = (rigs[1].root.children[0] as THREE.Group).children[0];
      expect(aGeometry).not.toBe(bGeometry);
    } finally { rigs.forEach(disposeArgentinaCandidate); }
  });
  it('articulates elbows and knees and places keeper gloves at covered sleeve wrists', () => {
    const field = createArgentinaCandidate('P03'); const keeper = createArgentinaCandidate('K01');
    try {
      expect(field.knees).toHaveLength(2); expect(field.elbows).toHaveLength(2);
      expect(field.legs.every(leg => leg.children.some(child => child.name === 'knee-pivot'))).toBe(true);
      expect(field.arms.every(arm => arm.children.some(child => child.name === 'elbow-pivot'))).toBe(true);
      for (const arm of keeper.arms) {
        const sleeve = arm.getObjectByName('long-sleeve') as THREE.Mesh; const glove = arm.getObjectByName('glove') as THREE.Mesh;
        expect(sleeve).toBeDefined(); expect(glove).toBeDefined();
        expect(glove.getWorldPosition(new THREE.Vector3()).distanceTo(arm.localToWorld(new THREE.Vector3(0,-.78,.08)))).toBeLessThan(.18);
        expect((arm.getObjectByName('forearm') as THREE.Mesh).material).toBe(sleeve.material);
        expect(arm.getObjectByName('glove-cuff')?.parent?.name).toBe('elbow-pivot');
      }
      let allShadowed = true;
      field.root.traverse(object => { if (object instanceof THREE.Mesh) allShadowed &&= object.castShadow && object.receiveShadow; });
      expect(allShadowed).toBe(true);
    } finally { disposeArgentinaCandidate(field); disposeArgentinaCandidate(keeper); }
  });
  it('disposes only resources owned by each independently created candidate', () => {
    const a = createArgentinaCandidate('P01'), b = createArgentinaCandidate('P01');
    const materialsA = new Set<THREE.Material>(), materialsB = new Set<THREE.Material>();
    a.root.traverse(o => { if (o instanceof THREE.Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) materialsA.add(m); });
    b.root.traverse(o => { if (o instanceof THREE.Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) materialsB.add(m); });
    expect([...materialsA].some(m => materialsB.has(m))).toBe(false);
    let disposeEvents = 0; for (const material of materialsB) material.addEventListener('dispose', () => disposeEvents++);
    const shirtA=a.root.getObjectByName('jersey') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshPhysicalMaterial>;
    const shirtB=b.root.getObjectByName('jersey') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshPhysicalMaterial>;
    expect(shirtA.material.map).not.toBe(shirtB.material.map);
    let textureDisposals=0;shirtA.material.map!.addEventListener('dispose',()=>textureDisposals++);
    disposeArgentinaCandidate(a); expect(disposeEvents).toBe(0);expect(textureDisposals).toBe(1);disposeArgentinaCandidate(b);
  });
  it('rejects invalid runtime ids and permits repeated disposal', () => {
    expect(() => createArgentinaCandidate('bad' as never)).toThrow(/candidate/i);
    const rig = createArgentinaCandidate('P01'); disposeArgentinaCandidate(rig); disposeArgentinaCandidate(rig);
  });
});
