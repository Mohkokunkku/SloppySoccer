import {afterEach,expect,it,vi} from 'vitest';
import {GameAudio} from './audio';
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
afterEach(()=>vi.unstubAllGlobals());
it('ducks music even when a small cheer decodes before the music and restores on voice end',async()=>{
 const gains:{gain:{value:number;setTargetAtTime:ReturnType<typeof vi.fn>};connect:()=>void;disconnect:()=>void}[]=[];
 const sources:{onended:(()=>void)|null;connect:()=>void;disconnect:()=>void;start:()=>void;stop:()=>void;buffer:unknown;loop:boolean}[]=[];
 class Context {state='running';currentTime=0;destination={};resume=async()=>{};suspend=async()=>{};close=async()=>{};decodeAudioData=async()=>({duration:1});
  createGain(){const gain={gain:{value:0,setTargetAtTime:vi.fn()},connect(){},disconnect(){}};gains.push(gain);return gain;}
  createBufferSource(){const s={onended:null as (()=>void)|null,buffer:null as unknown,loop:false,connect(){},disconnect(){},start(){},stop(){}};sources.push(s);return s;}
 }
 vi.stubGlobal('AudioContext',Context);
 let resolveMusic!:(value:unknown)=>void;const music=new Promise(resolve=>{resolveMusic=resolve;});
 const response=()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
 vi.stubGlobal('fetch',(url:string)=>url.includes('theme-')?music:Promise.resolve(response()));
 const audio=new GameAudio();audio.setEnabled(true);audio.updatePostMatch({id:'race',active:true,winner:'home',theme:0,elapsed:0,segment:'winners'});
 await flush();expect(audio.activeCount).toBe(1);resolveMusic(response());await flush();expect(audio.activeCount).toBe(2);
 const bed=gains[sources.findIndex(s=>s.loop)];expect(bed.gain.value).toBeCloseTo(.32*.28);
 sources.find(s=>!s.loop)!.onended!();expect(bed.gain.setTargetAtTime).toHaveBeenCalledWith(.32,0,.45);
 audio.quiet();expect(audio.activeCount).toBe(0);
});
