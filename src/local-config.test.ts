import {describe,expect,it} from 'vitest';
import {localControlGuide,selectedLocalConfig} from './local-config';

 describe('restart/rematch setup values',()=>{
  for(const action of ['Restart','paused Restart','Play again']){
    for(const [duration,difficulty] of [[60,'hard'],[180,'easy']] as const){
      it(`${action} preserves disabled checked ${duration}/${difficulty} and formations`,()=>{
        const radios=[
          {name:'duration',value:'120',checked:false,disabled:true},
          {name:'duration',value:String(duration),checked:true,disabled:true},
          {name:'difficulty',value:'normal',checked:false,disabled:true},
          {name:'difficulty',value:difficulty,checked:true,disabled:true},
        ];
        const formations={home:'1-2-1',away:'2-1-1'};
        expect(selectedLocalConfig(radios,formations)).toEqual({duration,difficulty,formations});
        expect(radios.every(field=>field.disabled)).toBe(true);
      });
    }
  }
  it('sanitizes absent or invalid choices',()=>{
    expect(selectedLocalConfig([],{})).toEqual({duration:120,difficulty:'normal',formations:{home:'2-1-1',away:'2-1-1'}});
  });
 });

 describe('persistent active seat guide',()=>{
  it('gives keyboard1 its team and solo arrow aliases',()=>{
    const guide=localControlGuide([{id:'p1',team:'away',device:'keyboard1'}]);
    for(const text of ['P1 Argentina ←','WASD','arrows','Space','E pass','Q switch','Left Shift'])expect(guide).toContain(text);
  });
  it('separates both keyboards and controllers with actual teams',()=>{
    const guide=localControlGuide([{id:'p1',team:'away',device:'keyboard1'},{id:'p2',team:'home',device:'keyboard2'},{id:'p3',team:'away',device:'gamepad:2'}]);
    for(const text of ['P1 Argentina ←: WASD','P2 Spain →: arrows','Enter shoot','/ pass','. switch','Right Shift','P3 Argentina ←: Controller 3','Cross pass','Circle shoot','L1 switch','R2 sprint','Options pause'])expect(guide).toContain(text);
    expect(guide).not.toContain('WASD or arrows');
  });
 });
