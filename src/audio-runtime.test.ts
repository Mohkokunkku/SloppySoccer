import {afterEach,expect,it,vi} from 'vitest';
import {GameAudio} from './audio';
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
function setup(deferred=false){
 const sources:{stop:ReturnType<typeof vi.fn>;start:ReturnType<typeof vi.fn>;onended:(()=>void)|null}[]=[];
 let decodeResolve:(value:AudioBuffer)=>void=()=>{};
 const decode=deferred?new Promise<AudioBuffer>(r=>{decodeResolve=r;}):Promise.resolve({} as AudioBuffer);
 const context={state:'running',currentTime:0,destination:{},resume:vi.fn(async()=>{}),suspend:vi.fn(async()=>{}),close:vi.fn(async()=>{}),decodeAudioData:vi.fn(()=>decode),createGain:()=>({gain:{value:0},connect:vi.fn(),disconnect:vi.fn()}),createBufferSource:()=>{const s={buffer:null,connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null as (()=>void)|null};sources.push(s);return s;}};
 vi.stubGlobal('AudioContext',class{constructor(){return context;}});
 const fetcher=vi.fn(async(_url:string)=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}));vi.stubGlobal('fetch',fetcher);
 return {sources,fetcher,decodeResolve};
}
afterEach(()=>vi.unstubAllGlobals());
it('is opt-in and plays exact sample paths with layered goals and bounded polyphony',async()=>{
 const m=setup(),a=new GameAudio();a.play('kick');await flush();expect(m.fetcher).not.toHaveBeenCalled();
 a.setEnabled(true);a.play('kick');a.play('goal');await flush();
 expect(m.fetcher.mock.calls.map(v=>String(v[0]))).toEqual(expect.arrayContaining(['/audio-v2/kick.wav','/audio-v2/crowd-goal.wav','/audio-v2/goal-music.wav']));
 expect(a.played).toBe(3);expect(a.activeCount).toBe(3);expect(a.pendingCount).toBe(0);
 for(let i=0;i<10;i++)a.play('goal');await flush();expect(a.activeCount).toBeLessThanOrEqual(6);
 a.quiet();expect(a.activeCount).toBe(0);expect(m.sources.every(s=>s.stop.mock.calls.length===1)).toBe(true);
});
it.each(['quiet','reset','mute','dispose'] as const)('%s cancels delayed decode without late playback',async action=>{
 const m=setup(true),a=new GameAudio();a.setEnabled(true);a.play('goal');await flush();expect(a.pendingCount).toBe(2);
 if(action==='mute')a.setEnabled(false);else a[action]();
 expect(a.pendingCount).toBe(0);m.decodeResolve({} as AudioBuffer);await flush();expect(a.played).toBe(0);expect(m.sources).toHaveLength(0);
});
it('cancels demo waiting for unlock and handles missing samples without rejection',async()=>{
 const m=setup(true),a=new GameAudio();a.demo();a.quiet();await flush();m.decodeResolve({} as AudioBuffer);await flush();expect(a.played).toBe(0);
 vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('missing');}));a.play('here');await flush();expect(a.lastError).toContain('sample');expect(a.pendingCount).toBe(0);
});
it('quiet invalidates pending browser resume and permits fresh playback afterwards',async()=>{
 const m=setup();let resume:()=>void=()=>{};
 const wait=new Promise<void>(r=>{resume=r;});
 const ctx=new AudioContext();vi.spyOn(ctx,'resume').mockReturnValue(wait);
 vi.stubGlobal('AudioContext',class{constructor(){return ctx;}});
 const a=new GameAudio();a.setEnabled(true);a.play('kick');a.quiet();resume();await flush();expect(m.sources).toHaveLength(0);
 a.play('pass-me');a.play('here');a.play('crowd-shot');await flush();
 expect(m.fetcher.mock.calls.map(v=>v[0])).toEqual(expect.arrayContaining(['/audio-v2/voice-go.wav','/audio-v2/voice-yes.wav','/audio-v2/crowd-shot.wav']));expect(a.played).toBe(3);
});
