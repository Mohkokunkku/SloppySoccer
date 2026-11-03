import type {GameState} from '../shared/types';
import {AudioEvents,type SoundEvent} from './audio-events';
/** Optional browser audio: no autoplay, no network speech service, no uncaught playback failures. */
export class GameAudio {
 enabled=false; played=0; lastError:string|null=null;
 private context:AudioContext|null=null;private events=new AudioEvents();
 private voice:HTMLAudioElement|null=null;
 private clips:Record<'goal'|'pass-me'|'here',HTMLAudioElement>={goal:new Audio('/audio/goal.wav'),'pass-me':new Audio('/audio/pass-me.wav'),here:new Audio('/audio/here.wav')};
 constructor(){for(const clip of Object.values(this.clips)){clip.preload='auto';clip.volume=0.65;clip.addEventListener('error',()=>{this.lastError='A voice clip could not be loaded.';});}}
 reset():void{this.events.reset();this.stopVoice();}
 setEnabled(enabled:boolean):void{this.enabled=enabled;this.lastError=null;if(enabled)void this.unlock();else{this.stopVoice();void this.context?.suspend().catch(()=>{});}}
 async unlock():Promise<void>{if(!this.enabled)return;try{this.context??=new AudioContext();await this.context.resume();}catch{this.lastError='Audio is unavailable in this browser.';}}
 private stopVoice():void{if(this.voice){this.voice.pause();this.voice.currentTime=0;this.voice=null;}}
 quiet():void{this.stopVoice();}
 update(state:GameState):void{const events=this.events.tick(state);if(this.enabled)for(const event of events)this.play(event);}
 play(event:SoundEvent):void{
  if(!this.enabled)return;
  if(event==='kick'){this.thump();return;}
  this.stopVoice();const clip=this.clips[event];clip.currentTime=0;this.voice=clip;
  void clip.play().then(()=>{this.played++;}).catch(()=>{this.lastError='Click Sound again to allow playback.';});
  if(event==='goal')this.fanfare();
 }
 demo():void{if(!this.enabled)this.setEnabled(true);void this.unlock().then(()=>{this.thump();this.play('pass-me');});}
 private tone(frequency:number,start:number,duration:number,volume:number,fall=false):void{
  const ctx=this.context;if(!ctx||ctx.state!=='running')return;
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=fall?'triangle':'sine';osc.frequency.setValueAtTime(frequency,start);if(fall)osc.frequency.exponentialRampToValueAtTime(48,start+duration);
  gain.gain.setValueAtTime(0.001,start);gain.gain.exponentialRampToValueAtTime(volume,start+0.008);gain.gain.exponentialRampToValueAtTime(0.001,start+duration);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+0.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};this.played++;
 }
 private thump():void{const ctx=this.context;if(!ctx)return;this.tone(170,ctx.currentTime,0.12,0.28,true);this.tone(780,ctx.currentTime,0.035,0.045,true);}
 private fanfare():void{const ctx=this.context;if(!ctx)return;[440,554.37,659.25].forEach((frequency,index)=>this.tone(frequency,ctx.currentTime+index*0.13,0.22,0.07));}
 dispose():void{this.enabled=false;this.stopVoice();void this.context?.close().catch(()=>{});for(const clip of Object.values(this.clips)){clip.removeAttribute('src');clip.load();}}
}
