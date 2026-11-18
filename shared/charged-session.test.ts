import {describe,it,expect} from 'vitest';
import {createGame,startGame,stepLocalGame,cancelShotCharges} from './engine';
import {EMPTY_INPUT,type GameState,type InputState} from './types';
import {chargedShotAngle,chargedShotPower} from './charged-shots';
function fixture():GameState{
  const s=createGame();startGame(s);
  s.controls=[{seatId:'p1',team:'home',playerId:'home-0'},{seatId:'p2',team:'away',playerId:'away-0'}];
  for(const p of s.players){p.x=p.team==='home'?-12:12;p.y=8;p.vx=p.vy=0;}
  Object.assign(s.players.find(p=>p.id==='home-0')!,{x:0,y:0,facing:0});
  Object.assign(s.ball,{x:.9,y:0,z:0,vx:0,vy:0,vz:0,ownerId:'home-0'});return s;
}
const tick=(s:GameState,part:Partial<InputState>,seat='p1')=>stepLocalGame(s,{[seat]:{...EMPTY_INPUT,...part}},1/60,undefined,'pulses');
const start=(s:GameState)=>tick(s,{chargeStart:true,shootHeld:true,shotCharge:0});
describe('authorized charged-shot sessions',()=>{
  it('prunes charge records when a human seat is removed',()=>{
    const s=fixture();start(s);s.controls=s.controls!.filter(c=>c.seatId!=='p1');
    tick(s,{},'p2');expect(s.shotCharges?.p1).toBeUndefined();
  });
  it('holds without shooting, exposes p1 charge and releases a stronger full kick exactly once',()=>{
    const short=fixture(),full=fixture();for(const s of[short,full])start(s);
    expect(short.ball.release).toBeUndefined();expect(short.shotCharges?.p1?.playerId).toBe('home-0');
    tick(full,{shootHeld:true,shotCharge:1});expect(full.shotCharges?.p1.value).toBe(1);
    tick(short,{shoot:true,shootHeld:false,shotCharge:0});tick(full,{shoot:true,shootHeld:false,shotCharge:1});
    expect(full.ball.release?.type).toBe('shot');
    expect(Math.hypot(full.ball.vx,full.ball.vy)).toBeGreaterThan(Math.hypot(short.ball.vx,short.ball.vy));
    const id=full.ball.release?.id;tick(full,{});expect(full.ball.release?.id).toBe(id);
    expect(Object.keys(full.shotCharges??{})).toHaveLength(0);
  });
  it('rejects an explicit charged release without an owned start',()=>{
    const s=fixture();tick(s,{shoot:true,shotCharge:1});expect(s.ball.release).toBeUndefined();expect(s.ball.ownerId).toBe('home-0');
  });
  it('cannot carry charge through losing and reacquiring possession',()=>{
    const s=fixture();start(s);s.ball.ownerId='away-0';tick(s,{shootHeld:true,shotCharge:.5});
    s.ball.ownerId='home-0';tick(s,{shoot:true,shotCharge:1});expect(s.ball.release).toBeUndefined();
  });
  it('cannot transfer charge to a newly selected player',()=>{
    const s=fixture();start(s);s.controls![0].playerId='home-1';s.ball.ownerId='home-1';
    tick(s,{shoot:true,shotCharge:1});expect(s.ball.release).toBeUndefined();
  });
  it('cancels pending authorization at a UI clear boundary',()=>{
    const s=fixture();start(s);cancelShotCharges(s);tick(s,{shoot:true,shotCharge:1});
    expect(s.ball.release).toBeUndefined();expect(Object.keys(s.shotCharges??{})).toHaveLength(0);
  });
  it('keeps other seats unauthorized until their own fresh possession/start',()=>{
    const s=fixture();start(s);tick(s,{chargeStart:true,shootHeld:true,shotCharge:0},'p2');
    expect(s.shotCharges?.p2).toBeUndefined();s.ball.ownerId='away-0';
    tick(s,{chargeStart:true,shootHeld:true,shotCharge:0},'p2');tick(s,{shoot:true,shotCharge:1},'p2');
    expect(s.ball.release?.playerId).toBe('away-0');
  });
  it('keeps legacy immediate shots and deterministic replay',()=>{
    const old=fixture();tick(old,{shoot:true});expect(old.ball.release?.type).toBe('shot');
    const a=fixture(),b=fixture();for(const s of[a,b]){start(s);tick(s,{shootHeld:true,shotCharge:.8});tick(s,{shoot:true,shotCharge:.8});}
    expect(a).toEqual(b);
  });
  it('uses finite bounded power and angular error even for invalid charge metadata',()=>{
    expect(chargedShotPower(22,0)).toBeCloseTo(8.8);expect(chargedShotPower(22,1)).toBeCloseTo(26.4);
    for(const c of [NaN,Infinity,-1,0,.5,1,3]){
      const a=chargedShotAngle(1,2,'home-0',c);expect(Number.isFinite(a)).toBe(true);expect(Math.abs(a-1)).toBeLessThanOrEqual(.080001);
    }
  });
});
