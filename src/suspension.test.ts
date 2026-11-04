import {afterEach,expect,it,vi} from 'vitest';
import {GameAudio} from './audio';
import {suspendGame} from './suspension';
import type {GameState} from '../shared/types';

const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
function audioBoundary(deferred:boolean){
  let resolveDecode:(buffer:AudioBuffer)=>void=()=>{};
  const decoded=deferred?new Promise<AudioBuffer>(resolve=>{resolveDecode=resolve;}):Promise.resolve({} as AudioBuffer);
  const sources:{start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>}[]=[];
  const context={state:'running',currentTime:0,destination:{},resume:async()=>{},decodeAudioData:()=>decoded,
    createGain:()=>({gain:{value:0},connect:vi.fn(),disconnect:vi.fn()}),
    createBufferSource:()=>{const source={buffer:null,start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn(),onended:null};sources.push(source);return source;}};
  vi.stubGlobal('AudioContext',class{constructor(){return context;}});
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})));
  return {sources,resolveDecode};
}
afterEach(()=>vi.unstubAllGlobals());
const phases:GameState['phase'][]=['ready','finished','entering','playing','goal','resetting'];
it.each(phases)('quiets active audition audio before phase-dependent pause handling in %s',async phase=>{
  const boundary=audioBoundary(false),audio=new GameAudio();
  audio.setEnabled(true);audio.play('goal');await flush();
  expect(audio.activeCount).toBe(2);
  const calls:string[]=[];
  let paused=false;
  suspendGame(audio,()=>{calls.push('clear');expect(audio.activeCount).toBe(0);},(value,moveFocus)=>{
    calls.push('pause');expect(audio.activeCount).toBe(0);expect(moveFocus).toBe(false);
    if(phase!=='ready'&&phase!=='finished')paused=value;
  });
  expect(calls).toEqual(['clear','pause']);
  expect(paused).toBe(phase!=='ready'&&phase!=='finished');
  expect(audio.activeCount).toBe(0);
  expect(boundary.sources.every(source=>source.stop.mock.calls.length===1)).toBe(true);
});
it.each(phases)('cancels pending audition decode without delayed starts in %s',async phase=>{
  const boundary=audioBoundary(true),audio=new GameAudio();
  audio.setEnabled(true);audio.play('goal');await flush();
  expect(audio.pendingCount).toBe(2);
  suspendGame(audio,()=>{},()=>{if(phase==='ready'||phase==='finished')return;audio.quiet();});
  expect(audio.pendingCount).toBe(0);
  boundary.resolveDecode({} as AudioBuffer);await flush();
  expect(audio.played).toBe(0);expect(audio.activeCount).toBe(0);expect(boundary.sources).toHaveLength(0);
});
