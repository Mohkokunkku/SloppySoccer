import {expect,it} from 'vitest';

import {createGame} from '../shared/engine';
import {createFigure,poseFigure} from './scene';
import {handshakeLayout,poseHandshakePair} from './handshake';

it('pairs stable roster IDs including keepers, independently of input order, without mutating players',()=>{
 const players=createGame().players, before=structuredClone(players);
 const expected=handshakeLayout(players), shuffled=handshakeLayout([...players].reverse());
 expect(expected).toEqual(shuffled);expect(expected).toHaveLength(5);expect(JSON.stringify(players)).toBe(JSON.stringify(before));
 expect(expected.map(p=>[p.homeId,p.awayId])).toEqual(Array.from({length:5},(_,i)=>[`home-${i}`,`away-${i}`]));
 expect(expected.every(p=>p.home.x<0&&p.away.x>0&&p.home.facing===0&&p.away.facing===Math.PI)).toBe(true);
});

it.each(['home-0','home-1','home-2','home-3','home-4','away-0','away-1','away-2','away-3','away-4'] as const)('touches hands and pumps both real rigs for %s',id=>{
 const game=createGame(),pair=handshakeLayout(game.players).find(p=>p.homeId===id||p.awayId===id)!;
 const home=game.players.find(p=>p.id===pair.homeId)!,away=game.players.find(p=>p.id===pair.awayId)!;
 const hr=createFigure(home,game.players.indexOf(home)),ar=createFigure(away,game.players.indexOf(away));
 poseFigure(hr,{...home,x:pair.home.x,y:pair.home.y,facing:pair.home.facing},1,false);
 poseFigure(ar,{...away,x:pair.away.x,y:pair.away.y,facing:pair.away.facing},1,false);
 const result=poseHandshakePair(hr,ar,0.4,false);hr.root.updateMatrixWorld(true);ar.root.updateMatrixWorld(true);
 expect(result.homeHand.distanceTo(result.awayHand)).toBeLessThanOrEqual(.12);
});

it('pumps both actual palms together while preserving connected limb lengths and mould scales',()=>{
 const game=createGame();
 for(const pair of handshakeLayout(game.players)){
  const home=game.players.find(p=>p.id===pair.homeId)!,away=game.players.find(p=>p.id===pair.awayId)!;
  const h=createFigure(home,game.players.indexOf(home)),a=createFigure(away,game.players.indexOf(away));
  poseFigure(h,{...home,...pair.home,vx:0,vy:0},1,false);poseFigure(a,{...away,...pair.away,vx:0,vy:0},1,false);
  const before=[h,a].map(r=>[r.root.scale.toArray(),r.arms[1].scale.toArray(),r.elbows![1].position.toArray(),r.elbows![1].scale.toArray()]);
  const first=poseHandshakePair(h,a,0),up=poseHandshakePair(h,a,.25),down=poseHandshakePair(h,a,.75);
  expect(up.homeHand.y).toBeGreaterThan(first.homeHand.y);expect(up.awayHand.y).toBeGreaterThan(first.awayHand.y);expect(down.homeHand.y).toBeLessThan(first.homeHand.y);expect(down.awayHand.y).toBeLessThan(first.awayHand.y);
  expect(up.homeHand.distanceTo(up.awayHand)).toBeLessThanOrEqual(.12);expect(down.homeHand.distanceTo(down.awayHand)).toBeLessThanOrEqual(.12);
  expect([h,a].map(r=>[r.root.scale.toArray(),r.arms[1].scale.toArray(),r.elbows![1].position.toArray(),r.elbows![1].scale.toArray()])).toEqual(before);
 }
});
it('holds reduced-motion hand contact static and resets handshake axes in normal pose',()=>{
 const game=createGame(),pair=handshakeLayout(game.players)[0],p=game.players.find(x=>x.id===pair.homeId)!,other=game.players.find(x=>x.id===pair.awayId)!;
 const rig=createFigure(p,0);
 const awayRig=createFigure(other,4);poseFigure(awayRig,{...other,x:pair.away.x,y:pair.away.y,facing:pair.away.facing},0,false);
 const one=poseHandshakePair(rig,awayRig,0.2,true);const two=poseHandshakePair(rig,awayRig,1.7,true);
 expect(one.homeHand.distanceTo(two.homeHand)).toBeCloseTo(0);expect(one.awayHand.distanceTo(two.awayHand)).toBeCloseTo(0);
 poseFigure(rig,p,0.1,false);poseFigure(awayRig,other,0.1,false);
 for(const r of [rig,awayRig]){expect(r.arms[1].rotation.y).toBe(0);expect(r.elbows?.[1].rotation.y).toBe(0);expect(r.elbows?.[1].rotation.z).toBe(0);}
});
