import {test,expect} from '@playwright/test';
type Frame={owner:string;phase:string;ball:number[];players:Record<string,{x:number;z:number}>};
type Observer={__defenseFrames:Frame[]};
for(const wing of [-1,1])test(`real wing ${wing} dribble preserves a wide defensive line with a small offset`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.getByRole('radio',{name:'Easy',exact:true}).check();
 await page.evaluate(()=>{const data=window as unknown as Observer;data.__defenseFrames=[];const pitch=document.querySelector<HTMLElement>('#pitch')!;
  const observe=()=>{if(pitch.dataset.phase==='playing'&&data.__defenseFrames.length<600)data.__defenseFrames.push({owner:pitch.dataset.ballOwnerId??'',phase:pitch.dataset.phase,ball:(pitch.dataset.ballPosition??'').split(',').map(Number),players:JSON.parse(pitch.dataset.playerPositions??'{}')});requestAnimationFrame(observe);};requestAnimationFrame(observe);});
 await page.locator('#start').click();await page.waitForFunction(()=>['intro','playing'].includes(document.querySelector<HTMLElement>('#pitch')?.dataset.phase??''),undefined,{timeout:30000});
 if(await page.locator('#pitch').getAttribute('data-phase')==='intro')await page.locator('#skip-intro').click();
 const key=wing<0?'ArrowUp':'ArrowDown';await page.keyboard.down(key);
 try{await expect.poll(()=>page.evaluate(wing=>{const frames=(window as unknown as Observer).__defenseFrames;return frames.some(f=>{
  const defenders=[f.players['home-2'],f.players['home-4']];if(defenders.some(p=>!p))return false;
  const [near,spare]=defenders.sort((a,b)=>b.x-a.x);
  // Formation stays broad; the user rejected the previous deep, narrow pair.
  return f.owner==='home-0'&&f.ball[1]*wing>2&&near.x-spare.x>.15&&near.x-spare.x<1.65
   &&Math.abs(near.z-spare.z)>=6;
 });},wing),{timeout:6000}).toBe(true);}finally{await page.keyboard.up(key);await info.attach('all-observed-frames.json',{body:JSON.stringify(await page.evaluate(()=>(window as unknown as Observer).__defenseFrames)),contentType:'application/json'});}
 await page.locator('#pause').click();const frames=await page.evaluate(()=>(window as unknown as Observer).__defenseFrames);
 await info.attach('actual-defender-frames.json',{body:JSON.stringify(frames),contentType:'application/json'});
 await page.screenshot({path:info.outputPath('staggered-defenders.png'),fullPage:true});expect(errors).toEqual([]);
});
