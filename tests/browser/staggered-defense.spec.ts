import {test,expect} from '@playwright/test';
type Frame={owner:string;phase:string;ball:number[];players:Record<string,{x:number;z:number}>};
type Observer={__defenseFrames:Frame[]};
for(const wing of [-1,1])test(`real wing ${wing} dribble leaves a forward ball-side defender and a central spare`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.getByRole('radio',{name:'Easy',exact:true}).check();
 await page.evaluate(()=>{const data=window as unknown as Observer;data.__defenseFrames=[];const pitch=document.querySelector<HTMLElement>('#pitch')!;
  const observe=()=>{if(pitch.dataset.phase==='playing'&&data.__defenseFrames.length<600)data.__defenseFrames.push({owner:pitch.dataset.ballOwnerId??'',phase:pitch.dataset.phase,ball:(pitch.dataset.ballPosition??'').split(',').map(Number),players:JSON.parse(pitch.dataset.playerPositions??'{}')});requestAnimationFrame(observe);};requestAnimationFrame(observe);});
 await page.locator('#start').click();await page.waitForFunction(()=>['intro','playing'].includes(document.querySelector<HTMLElement>('#pitch')?.dataset.phase??''),undefined,{timeout:30000});
 if(await page.locator('#pitch').getAttribute('data-phase')==='intro')await page.locator('#skip-intro').click();
 const key=wing<0?'ArrowUp':'ArrowDown';await page.keyboard.down(key);
 try{await expect.poll(()=>page.evaluate(wing=>{const frames=(window as unknown as Observer).__defenseFrames;return frames.some(f=>{
  const defenders=[f.players['home-2'],f.players['home-4']];if(defenders.some(p=>!p))return false;
  const [near,spare]=defenders.sort((a,b)=>b.x-a.x);
  // Responsibilities follow actual distance, not a hardcoded jersey/flank:
  // the kickoff's initially stepping player may remain nearest on either wing.
  return f.owner==='home-0'&&f.ball[1]*wing>2&&near.x-spare.x>.9&&Math.abs(spare.z)<2.8&&Math.abs(spare.z)<Math.abs(near.z)
   &&Math.hypot(near.x-f.ball[0],near.z-f.ball[1])<Math.hypot(spare.x-f.ball[0],spare.z-f.ball[1]);
 });},wing),{timeout:6000}).toBe(true);}finally{await page.keyboard.up(key);await info.attach('all-observed-frames.json',{body:JSON.stringify(await page.evaluate(()=>(window as unknown as Observer).__defenseFrames)),contentType:'application/json'});}
 await page.locator('#pause').click();const frames=await page.evaluate(()=>(window as unknown as Observer).__defenseFrames);
 await info.attach('actual-defender-frames.json',{body:JSON.stringify(frames),contentType:'application/json'});
 await page.screenshot({path:info.outputPath('staggered-defenders.png'),fullPage:true});expect(errors).toEqual([]);
});
