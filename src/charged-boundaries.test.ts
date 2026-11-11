import {expect,it} from 'vitest';
import {LocalInputHub} from './local-input';
import {LocalInputQueue} from './local-input-queue';
import {EMPTY_INPUT} from '../shared/types';
const pad=()=>({index:0,connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:10},()=>({pressed:false,value:0}))});
it('charges two keyboards independently and retains per-seat release order',()=>{
 let now=0;const h=new LocalInputHub(()=>[],()=>now);h.setSeats([{id:'p1',team:'home',device:'keyboard1'},{id:'p2',team:'away',device:'keyboard2'}]);
 h.keyDown('Space');now=300;h.keyDown('Enter');now=600;h.keyUp('Space');now=1500;h.keyUp('Enter');
 const p=h.poll();expect(p.actionGroups.p1).toHaveLength(2);expect(p.actionGroups.p2).toHaveLength(2);
 expect(p.actionGroups.p1[1]).toMatchObject({shoot:true,shotCharge:.5});expect(p.actionGroups.p2[1]).toMatchObject({shoot:true,shotCharge:1});
 expect(h.poll().actionGroups).toEqual({p1:[],p2:[]});
});
it('does not release another source while keyboard and two touch fingers share a charge',()=>{
 let now=0;const h=new LocalInputHub(()=>[],()=>now);h.keyDown('Space');h.pointerDown(1,'Space');h.pointerDown(2,'Space');
 expect(h.poll().actionGroups.p1).toHaveLength(1);now=600;h.pointerUp(1);h.keyUp('Space');expect(h.poll().inputs.p1).toMatchObject({shoot:false,shootHeld:true});
 h.pointerUp(2);expect(h.poll().actionGroups.p1).toEqual([{shoot:true,pass:false,switchPlayer:false,shotCharge:.5}]);
});
it('invalidates all held source releases at clear and assignment boundaries',()=>{
 const h=new LocalInputHub(()=>[]);h.keyDown('Space');h.pointerDown(1,'Space');h.clear();h.keyUp('Space');h.pointerUp(1);expect(h.poll().actionGroups.p1).toEqual([]);
 h.keyDown('Space');h.setSeats([{id:'p2',team:'away',device:'keyboard2'}]);h.keyUp('Space');expect(h.poll().actionGroups.p2).toEqual([]);
});
it('samples pad hold/release and never shoots a canceled held reconnect',()=>{
 let now=0;const p=pad(),h=new LocalInputHub(()=>[p] as unknown as Gamepad[],()=>now);h.setSeats([{id:'p1',team:'home',device:'gamepad:0'}]);
 p.buttons[1].pressed=true;expect(h.poll().inputs.p1).toMatchObject({chargeStart:true,shoot:false});now=900;expect(h.poll().inputs.p1).toMatchObject({shootHeld:true,shotCharge:.75});
 p.buttons[1].pressed=false;expect(h.poll().actionGroups.p1[0]).toMatchObject({shoot:true,shotCharge:.75});
 p.buttons[1].pressed=true;h.poll();p.connected=false;expect(h.poll().disconnected).toEqual(['p1']);p.connected=true;expect(h.poll().inputs.p1.shoot).toBe(false);
 p.buttons[1].pressed=false;expect(h.poll().actionGroups.p1).toEqual([]);
 p.buttons[1].pressed=true;expect(h.poll().inputs.p1.chargeStart).toBe(true);h.clear();p.buttons[1].pressed=false;expect(h.poll().actionGroups.p1).toEqual([]);
});
it('queues implicit charge starts once and combines chronological edges with latest held movement',()=>{
 const q=new LocalInputQueue();q.push({p1:{...EMPTY_INPUT,chargeStart:true,shootHeld:true,shotCharge:0}});q.push({p1:{...EMPTY_INPUT,moveX:1,shootHeld:true,shotCharge:.5}});
 expect(q.consume().p1).toMatchObject({chargeStart:true,shoot:false,moveX:1,shotCharge:0});expect(q.consume().p1).toMatchObject({shoot:false,moveX:1,shotCharge:.5});expect(q.consume().p1.chargeStart).toBeUndefined();
});
