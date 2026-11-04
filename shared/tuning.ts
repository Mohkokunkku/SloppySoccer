import {FIELD,type GameState,type GameTuning} from './types.js';
export const DEFAULT_TUNING: Readonly<GameTuning> = Object.freeze({fieldWidth:32,fieldHeight:20,goalWidth:7,goalHeight:2.8,runSpeed:5.6,sprintMultiplier:8.6/5.6,kickPower:22,passPower:15,keeperPower:13.8,acceleration:24,turnRate:7});
export const TUNING_LIMITS: Record<keyof GameTuning,{min:number;max:number;step:number;label:string;unit:string}> = {
 fieldWidth:{min:20,max:48,step:1,label:'Field length',unit:'m'},fieldHeight:{min:12,max:30,step:1,label:'Field width',unit:'m'},
 goalWidth:{min:3,max:10,step:.25,label:'Goal width',unit:'m'},goalHeight:{min:1.5,max:4,step:.1,label:'Goal height',unit:'m'},
 runSpeed:{min:3,max:9,step:.1,label:'Running speed',unit:'m/s'},sprintMultiplier:{min:1,max:2,step:.05,label:'Sprint multiplier',unit:'×'},
 kickPower:{min:12,max:36,step:.5,label:'Shot power',unit:'m/s'},passPower:{min:6,max:24,step:.5,label:'Pass power',unit:'m/s'},keeperPower:{min:8,max:20,step:.5,label:'Keeper clearance',unit:'m/s'},
 acceleration:{min:8,max:50,step:1,label:'Acceleration',unit:'m/s²'},turnRate:{min:2,max:16,step:.25,label:'Turning response',unit:'rad/s'},
};
export function sanitizeTuning(value:unknown,base:Readonly<GameTuning>=DEFAULT_TUNING):GameTuning{
 const candidate=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const next={...DEFAULT_TUNING};
 for(const key of Object.keys(TUNING_LIMITS) as (keyof GameTuning)[]){const rule=TUNING_LIMITS[key];const raw=candidate[key];const fallback=Number.isFinite(base[key])?base[key]:DEFAULT_TUNING[key];next[key]=Math.max(rule.min,Math.min(rule.max,typeof raw==='number'&&Number.isFinite(raw)?raw:fallback));}
 return next;
}
export function getTuning(state:Pick<GameState,'tuning'>):GameTuning{return state.tuning??{...DEFAULT_TUNING};}
/** Apply in place, preserve score/clock and never turn shrinking the field into a goal. */
export function applyTuning(state:GameState,patch:unknown):void{
 const before=getTuning(state);const next=sanitizeTuning(patch,before);state.tuning=next;
 if(before.fieldWidth===next.fieldWidth&&before.fieldHeight===next.fieldHeight&&before.goalWidth===next.goalWidth&&before.goalHeight===next.goalHeight)return;
 const clamp=(n:number,limit:number)=>Math.max(-limit,Math.min(limit,Number.isFinite(n)?n:0));
 // Entrance queues keep their original doorway anchor; only kickoff targets use the live field.
 if(state.phase!=='entering')for(const player of state.players){const x=clamp(player.x,next.fieldWidth/2-FIELD.playerRadius),y=clamp(player.y,next.fieldHeight/2-FIELD.playerRadius);if(player.x!==x)player.vx=0;if(player.y!==y)player.vy=0;player.x=x;player.y=y;}
 const x=clamp(state.ball.x,next.fieldWidth/2-FIELD.ballRadius),y=clamp(state.ball.y,next.fieldHeight/2-FIELD.ballRadius);
 if(state.ball.x!==x||state.ball.y!==y){state.ball.vx=state.ball.vy=0;state.ball.vz=0;state.ball.z=0;}
 state.ball.x=x;state.ball.y=y;
}
