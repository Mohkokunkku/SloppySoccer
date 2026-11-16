import {expect,it} from 'vitest';
import {createGame} from '../shared/engine';
import {fairPlayFrame,FAIR_PLAY_DURATION,FAIR_PLAY_ROUND_DURATION} from './fair-play';

it('schedules all 25 unique encounters in stable sorted-ID waves',()=>{
 const players=createGame().players;
 const a=fairPlayFrame(players,FAIR_PLAY_DURATION),b=fairPlayFrame([...players].reverse(),FAIR_PLAY_DURATION);
 expect(a.completedPairs).toHaveLength(25); expect(a.completedPairs).toEqual(b.completedPairs);
 for(const p of players) expect(a.completedPairs.filter(x=>x.homeId===p.id||x.awayId===p.id)).toHaveLength(5);
});
it('uses opposing continuous line positions and bounded smooth waves',()=>{
 const players=createGame().players, f=fairPlayFrame(players,2+4*FAIR_PLAY_ROUND_DURATION+.8);
 expect(f.pairs).toHaveLength(5); expect(f.pairs.every(p=>p.strength===1)).toBe(true);
 expect(Math.max(...Object.values(f.positions).map(p=>Math.abs(p.y)))).toBeLessThanOrEqual(9.2);
 for(const p of f.pairs){const h=f.positions[p.homeId],a=f.positions[p.awayId];expect(Math.abs(h.y-a.y)).toBeLessThan(1);expect(Math.abs(h.x+a.x)).toBeLessThan(0.01);}
});
it('only records an encounter after full contact and actually walks both lines past all opponents',()=>{
 const players=createGame().players,before=JSON.stringify(players),seen=new Set<string>();
 expect(fairPlayFrame(players,2.1).completedPairs).toHaveLength(0);
 for(let r=0;r<9;r++){
  const f=fairPlayFrame(players,2+r*FAIR_PLAY_ROUND_DURATION+.8);
  for(const pair of f.pairs){expect(pair.strength).toBe(1);const h=f.positions[pair.homeId],a=f.positions[pair.awayId];expect(Math.abs(h.y-a.y)).toBeLessThan(.8);seen.add(pair.homeId+':'+pair.awayId);}
 }
 expect(seen.size).toBe(25);expect(fairPlayFrame(players,16.3).completedPairs).toHaveLength(25);
 const start=fairPlayFrame(players,0),end=fairPlayFrame(players,18);for(const p of players)expect(Math.abs(end.positions[p.id].y-start.positions[p.id].y)).toBeGreaterThan(8);
 for(let r=1;r<9;r++){const t=2+r*FAIR_PLAY_ROUND_DURATION,a=fairPlayFrame(players,t-.001),b=fairPlayFrame(players,t+.001);for(const p of players)expect(Math.hypot(a.positions[p.id].x-b.positions[p.id].x,a.positions[p.id].y-b.positions[p.id].y)).toBeLessThan(.02);}
 expect(JSON.stringify(players)).toBe(before);
});
it('handles empty and nonfinite inputs deterministically',()=>{
 expect(fairPlayFrame([],NaN).stage).toBe('approach');
 expect(Object.keys(fairPlayFrame(createGame().players,Infinity).positions)).toHaveLength(10);
});
