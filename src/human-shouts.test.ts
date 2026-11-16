import {expect,it} from 'vitest';
import {HUMAN_SHOUTS} from './human-shouts';
import {GameAudio} from './audio';
import {vi} from 'vitest';

it('catalogs only honestly identified licensed recorded human shouts',()=>{
 expect(HUMAN_SHOUTS.map(clip=>clip.id)).toEqual(['cheer-yeah','cheer-we-did-it','cheer-champions','voice-go','voice-yes']);
 for(const clip of HUMAN_SHOUTS){
  expect(clip.path).toMatch(/^\/audio-v[23]\/[a-z0-9-]+\.wav\?v=human-v1$/);
  expect(clip.spokenText).not.toMatch(/we did it|we are the champions/i);
  expect(clip.source).toContain('Kenney Voiceover Pack');
  expect(clip.performer).not.toBe('');
  expect(clip.license).toBe('CC0');
  expect(clip.source.toLowerCase()).not.toMatch(/system\.speech|tts|synthesi[sz]/);
 }
});

it('keeps every vocal runtime route backed by a catalogued human recording',()=>{
 const routes=['voice-go','voice-yes','cheer-yeah','cheer-we-did-it','cheer-champions'];
 expect(routes.every(route=>HUMAN_SHOUTS.some(clip=>clip.id===route))).toBe(true);
});

it('loads each rotating winner cue from its catalogued human recording path',async()=>{
 const fetcher=vi.fn(async(url:string)=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(url).buffer}));
 const context={state:'running',currentTime:0,destination:{},resume:vi.fn(async()=>{}),suspend:vi.fn(async()=>{}),close:vi.fn(async()=>{}),decodeAudioData:vi.fn(async()=>({duration:1} as AudioBuffer)),createGain:()=>({gain:{value:0,setTargetAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()}),createBufferSource:()=>({buffer:null as unknown,loop:false,onended:null as (()=>void)|null,start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn()})};
 vi.stubGlobal('AudioContext',class{constructor(){return context;}});vi.stubGlobal('fetch',fetcher);
 const audio=new GameAudio();audio.setEnabled(true);
 for(let index=0;index<3;index++){
  audio.updatePostMatch({id:`winner-${index}`,active:true,winner:'home',theme:0,elapsed:0,segment:'winners'});
  for(let tick=0;tick<30;tick++)await Promise.resolve();
  audio.quiet();
 }
 expect(fetcher.mock.calls.map(call=>call[0])).toEqual(expect.arrayContaining(HUMAN_SHOUTS.slice(0,3).map(clip=>clip.path)));
});
