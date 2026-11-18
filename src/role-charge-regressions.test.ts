import {expect,it} from 'vitest';
import {createGame} from '../shared/engine';
import {roleChargeView} from './role-charge';

it('authorizes only the matching human seat and current ball owner without mutating state',()=>{
 const state=createGame();state.phase='playing';state.controls=[{seatId:'p1',team:'home',playerId:'home-0'},{seatId:'p2',team:'away',playerId:'away-0'}];state.controlledId='home-0';state.ball.ownerId='home-0';state.shotCharges={p1:{playerId:'home-0',value:.42},p2:{playerId:'away-0',value:.8}};
 const before=JSON.stringify(state);
 expect(roleChargeView(state,'home-0')).toMatchObject({charging:true,percent:42});
 expect(roleChargeView(state,'away-0').charging).toBe(false);
 expect(JSON.stringify(state)).toBe(before);
});

it('hides charges on cross-seat identity, lost possession, changed control, or unauthorized phase',()=>{
 const state=createGame();state.phase='playing';state.controls=[{seatId:'p1',team:'home',playerId:'home-0'},{seatId:'p2',team:'home',playerId:'home-1'}];state.controlledId='home-0';state.ball.ownerId='home-0';state.shotCharges={p1:{playerId:'home-1',value:.7},p2:{playerId:'home-0',value:.9}};
 expect(roleChargeView(state,'home-0').charging).toBe(false);
 state.shotCharges.p1.playerId='home-0';state.ball.ownerId='away-0';expect(roleChargeView(state,'home-0').background).toBe('');
 delete state.shotCharges.p2;state.ball.ownerId='home-0';state.controls=[{seatId:'p2',team:'home',playerId:'home-0'}];expect(roleChargeView(state,'home-0').charging).toBe(false);
 state.controls=[{seatId:'p1',team:'home',playerId:'home-0'}];state.phase='ready';expect(roleChargeView(state,'home-0').charging).toBe(false);
});
