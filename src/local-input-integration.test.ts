import {expect,it} from 'vitest';
import {createGame,skipIntro,startGame,stepLocalGame} from '../shared/engine';
import {assignLocalControls} from '../shared/local-controls';
import type {LocalSeat} from '../shared/types';
import {LocalInputHub} from './local-input';
import {LocalInputQueue} from './local-input-queue';
import {FixedStepper} from './loop';

it('delivers two keyboard taps per independent seat observed before one poll',()=>{
  const {state,hub,raf}=setup([{id:'p1',team:'home',device:'keyboard1'},{id:'p2',team:'away',device:'keyboard2'}]);
  for(const key of ['KeyQ','Period']){hub.keyDown(key);hub.keyUp(key);hub.keyDown(key);hub.keyUp(key);}
  const before=state.controls!.map(c=>c.playerId);raf(1/60);
  const first=state.controls!.map(c=>c.playerId);first.forEach((id,i)=>expect(id).not.toBe(before[i]));
  raf(1/60);const second=state.controls!.map(c=>c.playerId);second.forEach((id,i)=>expect(id).not.toBe(first[i]));
  raf(1/60);expect(state.controls!.map(c=>c.playerId)).toEqual(second);
});

it.each(['keyboard','touch'] as const)('preserves %s pass then shot observed before a single poll',source=>{
  const {state,hub,raf}=setup();
  if(source==='keyboard'){hub.keyDown('KeyE');hub.keyUp('KeyE');hub.keyDown('Space');}
  else {hub.pointerDown(1,'KeyE');hub.pointerUp(1);hub.pointerDown(2,'Space');}
  raf(1/60);expect(state.ball.release?.type).toBe('pass');const id=state.ball.release!.id;
  state.ball.ownerId=state.controls![0]!.playerId;raf(1/60);
  expect(state.ball.release?.type).toBe('shot');expect(state.ball.release?.id).toBe(id+1);
  state.ball.ownerId=state.controls![0]!.playerId;raf(1/60);expect(state.ball.release?.id).toBe(id+1);
});

function setup(seats:LocalSeat[]=[{id:'p1',team:'home',device:'keyboard1'}]) {
  const state=createGame();assignLocalControls(state,seats);startGame(state);
  const hub=new LocalInputHub(()=>[]);hub.setSeats(seats);
  const queue=new LocalInputQueue(),stepper=new FixedStepper();
  const raf=(delta:number)=>{const polled=hub.poll();queue.push(polled.inputs,polled.actionGroups);return stepper.advance(delta,dt=>stepLocalGame(state,queue.consume(),dt,{},'pulses'));};
  return {state,hub,queue,stepper,raf};
}

it.each([['shoot','Space','shot'],['pass','KeyE','pass']] as const)('delivers distinct %s presses on adjacent ticks across a release RAF with no tick',(action,key,type)=>{
  const {state,hub,raf}=setup();
  hub.keyDown(key);expect(raf(1/60)).toBe(1);
  expect(state.ball.release?.type).toBe(type);const first=state.ball.release!.id;
  hub.keyUp(key);expect(raf(1/240)).toBe(0);
  // Deterministic new possession isolates event delivery from ball travel/pickup lock.
  state.ball.ownerId=state.controls![0]!.playerId;
  hub.keyDown(key);expect(raf(1/80)).toBe(1);
  expect(state.ball.release?.id,action).toBe(first+1);
  state.ball.ownerId=state.controls![0]!.playerId;
  expect(raf(1/60)).toBe(1);expect(state.ball.release?.id).toBe(first+1);
});

it('delivers adjacent distinct switchPlayer events independently for two co-op seats',()=>{
  const {state,hub,raf}=setup([{id:'p1',team:'home',device:'keyboard1'},{id:'p2',team:'home',device:'keyboard2'}]);
  const ids=()=>state.controls!.map(c=>c.playerId);
  const before=ids();hub.keyDown('KeyQ');hub.keyDown('Period');raf(1/60);
  const first=ids();first.forEach((id,i)=>expect(id).not.toBe(before[i]));
  hub.keyUp('KeyQ');hub.keyUp('Period');expect(raf(1/240)).toBe(0);
  hub.keyDown('KeyQ');hub.keyDown('Period');expect(raf(1/80)).toBe(1);
  ids().forEach((id,i)=>{expect(id).not.toBe(first[i]);expect(state.players.find(p=>p.id===id)?.role).toBe('outfield');});
  expect(new Set(ids()).size).toBe(2);
  const second=ids();raf(1/60);expect(ids()).toEqual(second);
});

it('consumes intro pulses and clears pending skip/pause events at the caller boundary',()=>{
  const {state,hub,queue,stepper,raf}=setup();
  state.phase='ready';startGame(state,false,true);
  hub.keyDown('Space');raf(1/60);expect(state.ball.release).toBeUndefined();
  skipIntro(state);hub.clear();queue.clear();stepper.reset();raf(1/60);
  expect(state.ball.release).toBeUndefined();expect(state.controlledId).toBe('home-0');
  hub.keyUp('Space');raf(1/240);hub.keyDown('Space');raf(1/80);
  expect(state.ball.release?.type).toBe('shot');
  hub.keyUp('Space');hub.keyDown('KeyQ');expect(raf(1/240)).toBe(0);
  const id=state.controlledId;hub.clear();queue.clear();stepper.reset();raf(1/60);
  expect(state.controlledId).toBe(id);
});

it('delivers two switch polls queued before any tick independently for co-op seats',()=>{
  const {state,hub,raf}=setup([{id:'p1',team:'home',device:'keyboard1'},{id:'p2',team:'home',device:'keyboard2'}]);
  const ids=()=>state.controls!.map(c=>c.playerId),before=ids();
  hub.keyDown('KeyQ');expect(raf(1/240)).toBe(0);
  hub.keyUp('KeyQ');expect(raf(1/240)).toBe(0);
  hub.keyDown('KeyQ');hub.keyDown('Period');expect(raf(1/240)).toBe(0);
  expect(raf(1/240)).toBe(1);const first=ids();
  first.forEach((id,i)=>expect(id).not.toBe(before[i]));expect(new Set(first).size).toBe(2);
  expect(raf(1/60)).toBe(1);const second=ids();
  expect(second[0]).not.toBe(first[0]);expect(second[1]).toBe(first[1]);expect(new Set(second).size).toBe(2);
  raf(1/60);expect(ids()).toEqual(second);
});

it('keeps pass before shoot from different polls before the first simulation tick',()=>{
  const {state,hub,raf}=setup();
  hub.keyDown('KeyE');expect(raf(1/240)).toBe(0);
  hub.keyUp('KeyE');expect(raf(1/240)).toBe(0);
  hub.keyDown('Space');expect(raf(1/240)).toBe(0);
  expect(raf(1/240)).toBe(1);expect(state.ball.release?.type).toBe('pass');const first=state.ball.release!.id;
  // Restore possession only: test queued delivery, not travel or pickup timing.
  state.ball.ownerId=state.controls![0]!.playerId;
  raf(1/60);expect(state.ball.release?.type).toBe('shot');expect(state.ball.release?.id).toBe(first+1);
  state.ball.ownerId=state.controls![0]!.playerId;
  raf(1/60);expect(state.ball.release?.id).toBe(first+1);
});
