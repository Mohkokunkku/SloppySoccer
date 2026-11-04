import type {GameState} from '../shared/types';
import {AudioEvents,type SoundEvent} from './audio-events';
const MIX={kick:[['kick',.55]],'pass-me':[['voice-go',.6]],here:[['voice-yes',.6]],'crowd-shot':[['crowd-shot',.38]],goal:[['crowd-goal',.65],['goal-music',.42]]} as const;
/** Gesture-unlocked, opt-in sample playback. No synthetic speech or oscillator fallback. */
export class GameAudio {
 enabled=false;played=0;lastError:string|null=null;
 private context:AudioContext|null=null;private events=new AudioEvents();private generation=0;
 private buffers=new Map<string,Promise<AudioBuffer>>();
 private active=new Map<AudioBufferSourceNode,GainNode>();private pending=new Set<object>();
 get activeCount():number{return this.active.size;}
 get pendingCount():number{return this.pending.size;}
 reset():void{this.quiet();this.events.reset();}
 setEnabled(enabled:boolean):void{this.enabled=enabled;this.lastError=null;if(enabled)void this.unlock();else{this.quiet();void this.context?.suspend().catch(()=>{});}}
 async unlock():Promise<void>{if(!this.enabled)return;try{this.context??=new AudioContext();await this.context.resume();}catch{this.lastError='Audio is unavailable in this browser.';}}
 quiet():void{this.generation++;this.pending.clear();for(const source of [...this.active.keys()])this.stop(source);}
 private stop(source:AudioBufferSourceNode):void{const gain=this.active.get(source);if(!gain)return;this.active.delete(source);source.onended=null;try{source.stop();}catch{/* Already ended. */}source.disconnect();gain.disconnect();}
 update(state:GameState):void{const events=this.events.tick(state);if(this.enabled)for(const event of events)this.play(event);}
 play(event:SoundEvent):void{if(!this.enabled)return;for(const [name,gain] of MIX[event])void this.sample(name,gain,this.generation);}
 private async sample(name:string,volume:number,generation:number):Promise<void>{
  if(this.pending.size>=12)return;
  const ticket={};this.pending.add(ticket);
  try{
   await this.unlock();const ctx=this.context;
   if(!ctx||!this.enabled||generation!==this.generation||ctx.state!=='running')return;
   let buffer=this.buffers.get(name);
   if(!buffer){buffer=fetch(`/audio-v2/${name}.wav`).then(async response=>{if(!response.ok)throw new Error('Missing sample');return ctx.decodeAudioData(await response.arrayBuffer());});this.buffers.set(name,buffer);void buffer.catch(()=>{if(this.buffers.get(name)===buffer)this.buffers.delete(name);});}
   const decoded=await buffer;
   if(!this.enabled||generation!==this.generation||ctx.state!=='running')return;
   while(this.active.size>=6){const oldest=this.active.keys().next().value;if(oldest)this.stop(oldest);}
   const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=decoded;gain.gain.value=volume;source.connect(gain);gain.connect(ctx.destination);this.active.set(source,gain);
   source.onended=()=>{this.active.delete(source);source.disconnect();gain.disconnect();};
   try{source.start();this.played++;}catch(error){this.stop(source);throw error;}
  }catch{if(generation===this.generation)this.lastError='An audio sample could not be loaded or played.';}
  finally{this.pending.delete(ticket);}
 }
 demo():void{if(!this.enabled)this.setEnabled(true);const generation=this.generation;void this.unlock().then(()=>{if(this.enabled&&generation===this.generation){this.play('kick');this.play('pass-me');}});}
 dispose():void{this.enabled=false;this.quiet();this.buffers.clear();void this.context?.close().catch(()=>{});}
}
