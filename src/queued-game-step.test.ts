import{it,expect}from'vitest';import{createGame,startGame}from'../shared/engine';import{EMPTY_INPUT}from'../shared/types';import{LocalInputQueue}from'./local-input-queue';import{stepQueuedGame}from'./queued-game-step';
it('discards the remaining frozen-intro action backlog at natural kickoff',()=>{
 const state=createGame();startGame(state,false,true);state.phaseTimer=1/60;const selected=state.controlledId,q=new LocalInputQueue();
 q.push({p1:{...EMPTY_INPUT,switchPlayer:true}});q.push({p1:{...EMPTY_INPUT}});q.push({p1:{...EMPTY_INPUT,switchPlayer:true}});
 stepQueuedGame(state,q,1/60);expect(state.phase).toBe('playing');stepQueuedGame(state,q,1/60);expect(state.controlledId).toBe(selected);
});
it('preserves successive independent queued actions while the phase stays playing',()=>{
 const state=createGame();startGame(state);const selected=state.controlledId,q=new LocalInputQueue();q.push({p1:{...EMPTY_INPUT,switchPlayer:true}});q.push({p1:{...EMPTY_INPUT}});q.push({p1:{...EMPTY_INPUT,switchPlayer:true}});
 stepQueuedGame(state,q,1/60);const first=state.controlledId;expect(first).not.toBe(selected);stepQueuedGame(state,q,1/60);expect(state.controlledId).not.toBe(first);
});
