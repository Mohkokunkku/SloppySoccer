import{stepLocalGame}from'../shared/engine';
import type{GameState,MatchConfig}from'../shared/types';
import type{LocalInputQueue}from'./local-input-queue';
export function stepQueuedGame(state:GameState,queue:LocalInputQueue,dt:number,config?:MatchConfig):void{
 const previousPhase=state.phase;
 stepLocalGame(state,queue.consume(),dt,config,'pulses');
 // Actions queued while play was frozen must never leak across kickoff/reset.
 if(state.phase!==previousPhase)queue.clear();
}
