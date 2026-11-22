import * as THREE from 'three';
import type { Player } from '../shared/types';
import { ARGENTINA_CANDIDATES, createArgentinaCandidate, type ArgentinaCandidateId } from './argentina-candidate-models';
import type { FigureRig } from './scene';

export const CONFIRMED_ARGENTINA_LINEUP: Readonly<{outfield: readonly ArgentinaCandidateId[]; keeper: ArgentinaCandidateId}> = Object.freeze({
  outfield: Object.freeze(['P04', 'P01', 'P06', 'P05'] as const),
  keeper: 'K01',
});

const OUTFIELD_BY_PLAYER: Readonly<Record<string, ArgentinaCandidateId>> = Object.freeze({
  'away-0': 'P04', 'away-1': 'P01', 'away-2': 'P06', 'away-4': 'P05',
});

export function argentinaCandidateFor(player: Pick<Player, 'id'|'team'|'role'>): ArgentinaCandidateId | null {
  if (player.team !== 'away') return null;
  if (player.role === 'keeper') return CONFIRMED_ARGENTINA_LINEUP.keeper;
  return Object.hasOwn(OUTFIELD_BY_PLAYER,player.id) ? OUTFIELD_BY_PLAYER[player.id] : null;
}

export function createConfirmedArgentinaFigure(player: Player): FigureRig | null {
  const candidateId = argentinaCandidateFor(player);
  if (!candidateId) return null;
  const rig = createArgentinaCandidate(candidateId);
  rig.root.name = `player-${player.id}`;
  const candidate = ARGENTINA_CANDIDATES.find(item => item.id === candidateId)!;
  rig.root.userData.candidateId = candidateId;
  rig.root.userData.characterId = candidateId;
  rig.root.userData.displayName = candidate.name;
  rig.root.traverse(object => { if (candidate.role === 'keeper' && object.name === 'glove') object.name = 'hand'; });
  rig.root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(rig.root);
  rig.root.userData.floorOffset = -bounds.min.y;
  rig.root.userData.markerHeight = bounds.max.y - bounds.min.y + 0.3;
  return rig;
}
