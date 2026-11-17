import {afterEach,describe,expect,it,vi} from 'vitest';
import {GameAudio} from './audio';
import type {PostMatchView} from './post-match';
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
const view=(id:string,winner:PostMatchView['winner'],theme:0|1|2=0):PostMatchView=>({id,winner,theme,active:true,elapsed:1,segment:winner===null?'draw':'winners'});
const response=(path:string)=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(path).buffer});
function setup(deferSpain=false){
 const sources:{buffer:unknown;loop:boolean;onended:(()=>void)|null;start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>}[]=[];
 let resolveSpain!:(value:ReturnType<typeof response>)=>void;
 const spain=new Promise<ReturnType<typeof response>>(resolve=>{resolveSpain=resolve;});
 const fetcher=vi.fn(async(path:string)=>deferSpain&&path==='/audio-v5/spain-toy-pop.wav'?spain:response(path));
 const ctx={state:'running',currentTime:0,destination:{},resume:async()=>{},suspend:async()=>{},close:async()=>{},
  decodeAudioData:async(bytes:ArrayBuffer)=>({path:new TextDecoder().decode(bytes),duration:32}),
  createGain:()=>({gain:{value:0,setTargetAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()}),
  createBufferSource:()=>{const source={buffer:null as unknown,loop:false,onended:null as (()=>void)|null,start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn()};sources.push(source);return source;}};
 vi.stubGlobal('AudioContext',class{constructor(){return ctx;}});vi.stubGlobal('fetch',fetcher);
 return {sources,fetcher,resolveSpain};
}
afterEach(()=>vi.unstubAllGlobals());
describe('team-specific national victory playback',()=>{
 it.each(['home','away'] as const)('plays the %s anthem independently of the random visual dance',async winner=>{
  const m=setup(),audio=new GameAudio();audio.setEnabled(true);
  const path=winner==='home'?'/audio-v5/spain-toy-pop.wav':'/audio-v5/argentina-toy-pop.wav';
  for(const theme of [0,1,2] as const){audio.updatePostMatch(view(`party-${theme}`,winner,theme));await flush();
   const bed=m.sources.filter(s=>s.loop).at(-1)!;expect(bed.buffer).toMatchObject({path});expect(bed.start).toHaveBeenCalledOnce();expect(audio.activeCount).toBe(2);}
  expect(m.fetcher).toHaveBeenCalledWith(path);
  expect(m.fetcher.mock.calls.filter(([url])=>url.includes('/audio-v3/theme-'))).toHaveLength(0);
  expect(m.fetcher.mock.calls.filter(([url])=>url.includes('cheer-')).every(([url])=>url.endsWith('?v=human-v1'))).toBe(true);
  const count=m.sources.length;audio.updatePostMatch(view('party-2',winner,2));await flush();expect(m.sources).toHaveLength(count);
  audio.quiet();expect(audio.activeCount).toBe(0);expect(m.sources.every(s=>s.stop.mock.calls.length===1)).toBe(true);
 });
 it.each([0,1,2] as const)('keeps draw theme %s neutral and cheer-free',async theme=>{
  const m=setup(),audio=new GameAudio();audio.setEnabled(true);audio.updatePostMatch(view('draw',null,theme));await flush();
  expect(m.fetcher.mock.calls.map(([url])=>url)).toEqual([`/audio-v3/theme-${theme}.wav`]);expect(audio.activeCount).toBe(1);audio.dispose();
 });
 it('does not revive a late Spanish bed after an Argentinian rematch has started',async()=>{
  const m=setup(true),audio=new GameAudio();audio.setEnabled(true);audio.updatePostMatch(view('spain','home'));await flush();
  expect(audio.activeCount).toBe(1);expect(audio.pendingCount).toBe(1);
  audio.updatePostMatch(view('argentina','away',2));await flush();expect(audio.activeCount).toBe(2);
  m.resolveSpain(response('/audio-v5/spain-toy-pop.wav'));await flush();
  expect(m.sources.filter(s=>s.loop).map(s=>s.buffer)).toEqual([{path:'/audio-v5/argentina-toy-pop.wav',duration:32}]);
  expect(audio.activeCount).toBe(2);expect(audio.pendingCount).toBe(0);audio.dispose();
 });
});
