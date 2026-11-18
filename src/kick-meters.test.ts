import {afterEach, describe, expect, it, vi} from 'vitest';
import {kickMeterRows, KickMeters} from './kick-meters';
import type {GameState} from '../shared/types';

function state():GameState {
  return {players:[{id:'home-0',team:'home',role:'outfield',x:0,y:0,vx:0,vy:0,facing:0,stamina:1},
    {id:'away-0',team:'away',role:'outfield',x:1,y:0,vx:0,vy:0,facing:0,stamina:1}],
    controls:[{seatId:'p1',team:'home',playerId:'home-0'},{seatId:'p2',team:'away',playerId:'away-0'}],
    controlledId:'home-0',ball:{x:0,y:0,z:0,vx:0,vy:0,vz:0,ownerId:'home-0'},
    phase:'playing',phaseTimer:0,elapsed:0,timeRemaining:10,score:{home:0,away:0},lastScorer:null};
}
class ElementDouble {
  children:ElementDouble[]=[];textContent='';hidden=false;className='';
  attributes=new Map<string,string>();style={setProperty:vi.fn()};
  append(...nodes:ElementDouble[]){this.children.push(...nodes);}
  replaceChildren(...nodes:ElementDouble[]){this.children=nodes;}
  setAttribute(name:string,value:string){this.attributes.set(name,value);}
}
afterEach(()=>vi.unstubAllGlobals());
describe('authorized per-seat kick meter',()=>{
  it('only displays the current owner and matching charge actor with finite bounded values',()=>{
    const s=state();s.shotCharges={p1:{playerId:'home-0',value:2},p2:{playerId:'away-0',value:.8}};
    expect(kickMeterRows(s).map(r=>[r.seatId,r.value,r.charging])).toEqual([['p1',1,true],['p2',0,false]]);
    s.shotCharges.p1.value=NaN;expect(kickMeterRows(s)[0].value).toBe(0);
    s.shotCharges.p1.playerId='away-0';expect(kickMeterRows(s)[0].charging).toBe(false);
  });
  it('hides frozen/finished charges and leaves simulation untouched',()=>{
    const s=state();s.shotCharges={p1:{playerId:'home-0',value:.6}};s.phase='finished';
    const before=structuredClone(s);expect(kickMeterRows(s).every(r=>r.value===0&&!r.charging)).toBe(true);expect(s).toEqual(before);
  });
  it('updates accessible stable meter nodes rather than rebuilding each frame',()=>{
    vi.stubGlobal('document',{createElement:()=>new ElementDouble()});
    const host=new ElementDouble(),meters=new KickMeters(host as unknown as HTMLElement),s=state();
    meters.update(s);expect(host.children).toHaveLength(2);const first=host.children[0];
    s.shotCharges={p1:{playerId:'home-0',value:.5}};meters.update(s);expect(host.children[0]).toBe(first);
    const track=first.children.find(n=>n.attributes.get('role')==='progressbar')!;
    expect(track.attributes.get('aria-valuenow')).toBe('50');
    s.phase='intro';meters.update(s);expect(host.hidden).toBe(true);
  });
});
