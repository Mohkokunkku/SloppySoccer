import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildTabletop, createFigure, createFootball, cameraBounds, poseFigure } from './scene';
import { FIELD, type Player } from '../shared/types';
import {TEAMS} from './teams';

it('frames the entire tabletop at both desktop and portrait aspect ratios', () => {
  for (const aspect of [2.2, 1.7, 1, 0.7]) {
    const bounds = cameraBounds(aspect);
    expect(bounds.width).toBeGreaterThanOrEqual(43);
    expect(bounds.height).toBeGreaterThanOrEqual(29);
    expect(bounds.width / bounds.height).toBeCloseTo(aspect);
  }
});

describe('offline procedural toy geometry', () => {
  it('shows national kit colours, Argentine stripes and country corner flags',()=>{
    const p:Player={id:'home-0',team:'home',role:'outfield',x:0,y:0,vx:0,vy:0,facing:0,stamina:1};
    const spain=createFigure(p,0);const argentina=createFigure({...p,id:'away-0',team:'away'},4);
    expect(((spain.root.getObjectByName('jersey') as THREE.Mesh).material as THREE.MeshPhysicalMaterial).color.getHex()).toBe(TEAMS.home.primary);
    expect(argentina.root.getObjectByName('argentina-stripe')).toBeDefined();
    const board=buildTabletop();expect(board.getObjectByName('flag-home')).toBeDefined();expect(board.getObjectByName('flag-away')).toBeDefined();
  });
  it('applies a winning cheer and restores neutral limbs afterward',()=>{
    const p:Player={id:'home-0',team:'home',role:'outfield',x:0,y:0,vx:0,vy:0,facing:0,stamina:1};const rig=createFigure(p,0);
    poseFigure(rig,p,0,false,{style:0,seconds:0.3,index:0});
    expect(rig.root.position.y).toBeGreaterThan(0.2);expect(Math.abs(rig.arms[0].rotation.z)).toBeGreaterThan(2);
    poseFigure(rig,p,0,false);expect(rig.root.position.y).toBe(0.1);expect(rig.arms[0].rotation.z).toBeCloseTo(-0.26);
  });
  it('maps game coordinates and facing to the scene and supports reduced-motion waddling', () => {
    const player: Player = { id: 'h1', team: 'home', role: 'outfield', x: 5, y: -3, vx: 4, vy: 0, facing: 0, stamina: 1 };
    const rig = createFigure(player, 0);
    poseFigure(rig, player, 0.1, false);
    expect(rig.root.position.x).toBe(5); expect(rig.root.position.z).toBe(-3);
    expect(rig.root.rotation.y).toBeCloseTo(Math.PI / 2);
    expect(Math.abs(rig.legs[0].rotation.x)).toBeGreaterThan(0);
    poseFigure(rig, player, 0.1, true);
    expect(rig.legs[0].rotation.x).toBe(0);
  });
  it('builds a striped full pitch, oak plinth and two rectangular lattice goals', () => {
    const table = buildTabletop();
    expect(table.getObjectByName('pitch')).toBeDefined();
    expect(table.getObjectByName('oak-plinth')).toBeDefined();
    expect(table.getObjectByName('goal-home')).toBeDefined();
    expect(table.getObjectByName('goal-away')).toBeDefined();
    expect(table.getObjectByName('goal-home')!.position.x).toBe(-16);
    expect(table.getObjectByName('goal-away')!.position.x).toBe(16);
    expect(table.getObjectByName('goal-home')!.getObjectByName('lattice')).toBeInstanceOf(THREE.InstancedMesh);
  });
  it('creates separately articulated limbs, facial detail and tall black boots', () => {
    const player: Player = { id: 'h1', team: 'home', role: 'outfield', x: 0, y: 0, vx: 0, vy: 0, facing: 0, stamina: 1 };
    const figure = createFigure(player, 0);
    expect(figure.root.getObjectByName('face')).toBeDefined();
    expect(figure.root.getObjectByName('hair')).toBeDefined();
    expect(figure.legs).toHaveLength(2);
    expect(figure.arms).toHaveLength(2);
    expect(figure.root.getObjectByName('boot-left')).toBeDefined();
    const ball = createFootball();
    const patches = ball.getObjectByName('black-patches');
    expect(patches).toBeDefined();
    expect(patches!.children.every(patch => patch.position.length() > FIELD.ballRadius)).toBe(true);
  });
});
