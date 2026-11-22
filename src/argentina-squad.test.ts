import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createGame } from '../shared/engine';
import { ARGENTINA_CANDIDATES, createArgentinaCandidate } from './argentina-candidate-models';
import { argentinaCandidateFor, CONFIRMED_ARGENTINA_LINEUP, createConfirmedArgentinaFigure } from './argentina-squad';

describe('confirmed Argentina squad', () => {
  it('maps the away roster by stable ID, regardless of array order or tactical role', () => {
    expect(CONFIRMED_ARGENTINA_LINEUP).toEqual({ outfield: ['P04', 'P01', 'P06', 'P05'], keeper: 'K01' });
    const players = createGame().players;
    for (const player of players) {
      const expected = player.team !== 'away' ? null : player.role === 'keeper' ? 'K01' : ({ 'away-0': 'P04', 'away-1': 'P01', 'away-2': 'P06', 'away-4': 'P05' } as Record<string,string>)[player.id] ?? null;
      expect(argentinaCandidateFor(player)).toBe(expected);
      player.tacticalRole = player.tacticalRole === 'attacker' ? 'defender' : 'attacker';
      expect(argentinaCandidateFor(player)).toBe(expected);
    }
    expect([...players].reverse().map(argentinaCandidateFor)).toEqual(players.map(argentinaCandidateFor).reverse());
  });

  it('returns null for home and unknown away outfield IDs, and selects keepers by role', () => {
    expect(argentinaCandidateFor({ id:'home-0', team:'home', role:'outfield' })).toBeNull();
    expect(argentinaCandidateFor({ id:'away-99', team:'away', role:'outfield' })).toBeNull();
    expect(argentinaCandidateFor({ id:'away-0', team:'away', role:'keeper' })).toBe('K01');
  });

  it('creates an independent exact candidate rig with metadata, mould bounds and real articulated hands', () => {
    const player = createGame().players.find(p => p.id === 'away-0')!;
    const original = { ...player };
    const expected = createArgentinaCandidate('P04');
    const rig = createConfirmedArgentinaFigure(player)!;
    try {
      expect(rig.root.name).toBe('player-away-0');
      expect(rig.root.userData).toMatchObject({ candidateId:'P04', characterId:'P04', displayName:ARGENTINA_CANDIDATES.find(x=>x.id==='P04')!.name });
      expect(rig.legs).toHaveLength(2); expect(rig.arms).toHaveLength(2); expect(rig.knees).toHaveLength(2); expect(rig.elbows).toHaveLength(2);
      expect(rig.root.scale.toArray()).toEqual([1,1,1]);
      const bounds = new THREE.Box3().setFromObject(rig.root);
      expect(rig.root.userData.floorOffset).toBeCloseTo(-bounds.min.y);
      expect(rig.root.userData.markerHeight).toBeCloseTo(bounds.max.y-bounds.min.y+0.3);
      const hand = new THREE.Vector3();
      rig.root.updateMatrixWorld(true);
      const hands:THREE.Vector3[]=[];
      rig.root.traverse(o=>{if(o.name==='hand')hands.push(o.getWorldPosition(new THREE.Vector3()));});
      expect(hands).toHaveLength(2); expect(hands.every(h=>Number.isFinite(h.x+h.y+h.z))).toBe(true);
      const sig=(root:THREE.Object3D)=>{const out:unknown[]=[];root.traverse(o=>{if(o instanceof THREE.Mesh)out.push([o.name,o.geometry.type,o.position.toArray(),o.scale.toArray()]);});return out;};
      expect(sig(rig.root)).toEqual(sig(expected.root));
      expect(player).toEqual(original);
      expect(rig.root.children[0]).not.toBe(expected.root.children[0]);
    } finally { expected.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}}); rig.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}}); }
  });

  it('rejects prototype property names as unknown player IDs',()=>{for(const id of ['toString','__proto__','constructor'])expect(argentinaCandidateFor({id,team:'away',role:'outfield'})).toBeNull();});

  it('renames only runtime keeper glove meshes and leaves candidate factory geometry intact', () => {
    const player = createGame().players.find(p => p.role === 'keeper' && p.team === 'away')!;
    const original = createArgentinaCandidate('K01'), runtime = createConfirmedArgentinaFigure(player)!;
    try {
      const names=(root:THREE.Object3D)=>{const out:string[]=[];root.traverse(o=>{if(o.name==='hand'||o.name==='glove')out.push(o.name);});return out;};
      expect(names(original.root)).toEqual(['glove','glove']);
      expect(names(runtime.root)).toEqual(['hand','hand']);
    } finally { for(const root of [original.root,runtime.root])root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}}); }
  });
});
