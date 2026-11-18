import {expect,it} from 'vitest';
import {PostMatchDirector,POST_MATCH_DURATION} from './post-match';
it.each([[2,1,16,34],[1,2,16,34],[1,1,8,26]])('reserves a complete fair-play line after %s-%s without changing simulation',(home,away,start,end)=>{
 const state={phase:'finished' as const,score:{home,away}},before=JSON.stringify(state),d=new PostMatchDirector(state,'fair-game',()=>0);
 for(let t=0;t<start;t+=.25)d.update(.25);expect(d.view).toMatchObject({active:true,segment:'handshake',elapsed:start});
 expect(d.update(.25,true).elapsed).toBe(start);
 for(let t=start;t<end-.25;t+=.25)d.update(.25);expect(d.view.segment).toBe('handshake');d.update(.25);expect(d.view).toMatchObject({active:false,segment:'done',elapsed:end});expect(JSON.stringify(state)).toBe(before);
 expect(POST_MATCH_DURATION).toBe(34);
});
it('skip ends the longer fair-play line immediately and remains stable',()=>{const d=new PostMatchDirector({phase:'finished',score:{home:0,away:0}},'skip');for(let i=0;i<40;i++)d.update(.25);expect(d.view.segment).toBe('handshake');d.skip();expect(d.update(1)).toMatchObject({active:false,segment:'done'});});
