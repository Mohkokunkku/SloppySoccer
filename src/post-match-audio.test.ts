import {afterEach,expect,it,vi} from 'vitest';
import {GameAudio} from './audio';
import type {PostMatchView} from './post-match';
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function setup(){
 const sources:{start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;onended:(()=>void)|null;buffer:unknown}[]=[];
 const context={state:'running',currentTime:0,destination:{},resume:vi.fn(async()=>{}),suspend:vi.fn(async()=>{}),close:vi.fn(async()=>{}),decodeAudioData:vi.fn(async()=>({duration:2} as AudioBuffer)),createGain:()=>({gain:{value:0,setTargetAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()}),createBufferSource:()=>{const s={buffer:null as unknown,start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn(),onended:null as (()=>void)|null};sources.push(s);return s;}};
 vi.stubGlobal('AudioContext',class{constructor(){return context;}});
 const fetcher=vi.fn(async(url:string)=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(url).buffer}));vi.stubGlobal('fetch',fetcher);return {sources,fetcher};
}
afterEach(()=>vi.unstubAllGlobals());
const view=(id:string,active=true,theme:0|1|2=0,segment:PostMatchView['segment']='winners',winner:'home'|'away'|null='home'):PostMatchView=>({id,active,winner,theme,elapsed:1,segment});
it('starts one distinct theme bed per party id, avoids frame repeats, and stops when inactive',async()=>{
 const m=setup(),a=new GameAudio();a.setEnabled(true);a.updatePostMatch(view('match-a'));await flush();
 expect(m.fetcher).toHaveBeenCalledWith('/audio-v3/theme-0.wav');expect(a.activeCount).toBe(2);
 a.updatePostMatch(view('match-a'));await flush();expect(m.fetcher).toHaveBeenCalledTimes(2);
 a.updatePostMatch(view('match-a',false));expect(a.activeCount).toBe(0);expect(m.sources.every(s=>s.stop.mock.calls.length===1)).toBe(true);
});
it('uses three distinct themes, winner-only cheers, and quiet/reenable lifecycle',async()=>{
 const m=setup(),a=new GameAudio();a.setEnabled(true);
 for(const theme of [0,1,2] as const){a.updatePostMatch(view(`theme-${theme}`,true,theme));await flush();a.quiet();}
 expect(m.fetcher.mock.calls.map(c=>c[0])).toEqual(expect.arrayContaining(['/audio-v3/theme-0.wav','/audio-v3/theme-1.wav','/audio-v3/theme-2.wav']));
 const cheersBefore=m.fetcher.mock.calls.filter(c=>String(c[0]).includes('cheer')).length;
 a.updatePostMatch(view('draw',true,0,'draw',null));await flush();expect(m.fetcher.mock.calls.filter(c=>String(c[0]).includes('cheer'))).toHaveLength(cheersBefore);
 a.updatePostMatch(view('winner',true,1));await flush();expect(m.fetcher).toHaveBeenCalledWith('/audio-v3/cheer-yeah.wav');
 a.quiet();a.updatePostMatch(view('resume',true,2));await flush();expect(a.activeCount).toBe(2);
});
