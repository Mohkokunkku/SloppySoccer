import {expect,it} from 'vitest';
import {PostMatchDirector,POST_MATCH_DURATION} from './post-match';
it.each([['home',2,1],['away',1,2]] as const)('ends the dancing with cross-team handshakes when %s wins',(winner,home,away)=>{
 const s={phase:'finished' as const,score:{home,away}},before=JSON.stringify(s),d=new PostMatchDirector(s,'handshake',()=>.5);
 for(let i=0;i<63;i++)d.update(.25);expect(d.view.segment).toBe('finale');d.update(.25);
 expect(d.view).toMatchObject({winner,segment:'handshake',active:true,elapsed:16});expect(d.update(.25,true).elapsed).toBe(16);
 for(let i=0;i<72;i++)d.update(.25);expect(d.view.segment).toBe('done');expect(d.view.active).toBe(false);expect(POST_MATCH_DURATION).toBe(34);expect(JSON.stringify(s)).toBe(before);
});
it('can skip a handshake and starts neutral draw sportsmanship without changing the saved result',()=>{
 const d=new PostMatchDirector({phase:'finished',score:{home:1,away:0}},'skip');for(let i=0;i<72;i++)d.update(.25);expect(d.view.segment).toBe('handshake');d.skip();expect(d.update(.25)).toMatchObject({active:false,segment:'done'});
 const draw=new PostMatchDirector({phase:'finished',score:{home:1,away:1}},'draw');for(let i=0;i<32;i++)draw.update(.25);expect(draw.view).toMatchObject({active:true,segment:'handshake',winner:null,elapsed:8});
});
