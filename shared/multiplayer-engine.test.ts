import {expect,it} from 'vitest';
import {createGame,startGame,stepGame,stepLocalGame} from './engine.js';
import {assignLocalControls} from './local-controls.js';
import {EMPTY_INPUT} from './types.js';
it.each(['legacy','default','explicit'] as const)('%s held API suppresses repeated actions until release',mode=>{
  const s=createGame();startGame(s);
  const tick=(shoot:boolean)=>{const input={...EMPTY_INPUT,shoot};if(mode==='legacy')stepGame(s,input,.01);else if(mode==='explicit')stepLocalGame(s,{p1:input},.01,{},'held');else stepLocalGame(s,{p1:input},.01);};
  tick(true);expect(s.ball.release?.id).toBe(1);
  s.ball.ownerId=s.controlledId;tick(true);expect(s.ball.release?.id).toBe(1);
  tick(false);s.ball.ownerId=s.controlledId;tick(true);expect(s.ball.release?.id).toBe(2);
});
it('held switch edges remain independent per seat and cannot repeat',()=>{
  const s=createGame();assignLocalControls(s,[{id:'p1',team:'home',device:'keyboard1'},{id:'p2',team:'away',device:'keyboard2'}]);startGame(s);
  const ids=()=>s.controls!.map(c=>c.playerId),before=ids(),pressed={...EMPTY_INPUT,switchPlayer:true};
  stepLocalGame(s,{p1:pressed},.01);const first=ids();expect(first[0]).not.toBe(before[0]);expect(first[1]).toBe(before[1]);
  stepLocalGame(s,{p1:pressed,p2:pressed},.01);expect(ids()[0]).toBe(first[0]);expect(ids()[1]).not.toBe(first[1]);
  const second=ids();stepLocalGame(s,{p1:pressed,p2:pressed},.01);expect(ids()).toEqual(second);
});
it.each(['2-1-1','1-2-1'] as const)('gives both teams correct distinct %s roles and lanes',formation=>{const s=createGame({formations:{home:formation,away:formation}});for(const team of ['home','away'] as const){const ps=s.players.filter(p=>p.team===team&&p.role==='outfield');expect(ps.filter(p=>p.tacticalRole==='defender')).toHaveLength(formation==='2-1-1'?2:1);expect(ps.filter(p=>p.tacticalRole==='midfielder')).toHaveLength(formation==='1-2-1'?2:1);expect(new Set(ps.map(p=>`${p.x},${p.y}`)).size).toBe(4);}});
it('uses symmetric bot speeds with opposing humans regardless of difficulty',()=>{const states=(['easy','hard'] as const).map(difficulty=>{const s=createGame();assignLocalControls(s,[{id:'p1',team:'home',device:'keyboard1'},{id:'p2',team:'away',device:'keyboard2'}]);startGame(s);stepLocalGame(s,{},.1,{difficulty});return s;});expect(states[0]).toEqual(states[1]);});
it('creates ten formation players retaining keeper IDs',()=>{const s=createGame({formations:{home:'1-2-1',away:'2-1-1'}});expect(s.players).toHaveLength(10);expect(s.players.find(p=>p.id==='home-4')?.tacticalRole).toBe('midfielder');expect(s.players.find(p=>p.id==='away-3')?.role).toBe('keeper');});
it.each(['home','away'] as const)('moves independent co-op seats on %s and switches without duplicates',team=>{const s=createGame();assignLocalControls(s,[{id:'p1',team,device:'keyboard1'},{id:'p2',team,device:'keyboard2'}]);startGame(s);const ids=s.controls!.map(c=>c.playerId);const ys=ids.map(id=>s.players.find(p=>p.id===id)!.y);stepLocalGame(s,{p1:{...EMPTY_INPUT,moveY:1},p2:{...EMPTY_INPUT,moveY:-1}},.1);expect(s.players.find(p=>p.id===ids[0])!.y).toBeGreaterThan(ys[0]!);expect(s.players.find(p=>p.id===ids[1])!.y).toBeLessThan(ys[1]!);stepLocalGame(s,{p1:{...EMPTY_INPUT,switchPlayer:true},p2:{...EMPTY_INPUT,switchPlayer:true}},.1);expect(new Set(s.controls!.map(c=>c.playerId)).size).toBe(2);for(const c of s.controls!){expect(c.team).toBe(team);expect(s.players.find(p=>p.id===c.playerId)?.role).toBe('outfield');}});
it('never auto acts for opposing human owners and keeps per-seat shot edges',()=>{const s=createGame();assignLocalControls(s,[{id:'p1',team:'home',device:'keyboard1'},{id:'p2',team:'away',device:'keyboard2'}]);startGame(s);s.elapsed=2;s.ball.ownerId='away-0';stepLocalGame(s,{},.01);expect(s.ball.ownerId).toBe('away-0');stepLocalGame(s,{p1:{...EMPTY_INPUT,shoot:true}},.01);s.ball.ownerId='away-0';stepLocalGame(s,{p1:{...EMPTY_INPUT,shoot:true},p2:{...EMPTY_INPUT,shoot:true}},.01);expect(s.ball.release?.playerId).toBe('away-0');});
it('passing to a human preserves both bindings',()=>{const s=createGame();assignLocalControls(s,[{id:'p1',team:'home',device:'keyboard1'},{id:'p2',team:'home',device:'keyboard2'}]);startGame(s);const before=structuredClone(s.controls);Object.assign(s.players.find(p=>p.id==='home-1')!,{x:3,y:0});stepLocalGame(s,{p1:{...EMPTY_INPUT,pass:true,moveX:1}},.01);expect(s.ball.release?.type).toBe('pass');expect(s.controls).toEqual(before);});
