import {test,expect} from '@playwright/test';
type Frame={owner:string;ball:number[];players:Record<string,{x:number;z:number}>};
type Watch={__coverFrames:Frame[]};
test('a real wing attack keeps separate goal-side cover behind the forechecker',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.getByRole('radio',{name:'Easy',exact:true}).check();
 await page.evaluate(()=>{const w=window as unknown as Watch;w.__coverFrames=[];const pitch=document.querySelector<HTMLElement>('#pitch')!;const watch=()=>{if(pitch.dataset.phase==='playing'&&w.__coverFrames.length<1000)w.__coverFrames.push({owner:pitch.dataset.ballOwnerId??'',ball:(pitch.dataset.ballPosition??'').split(',').map(Number),players:JSON.parse(pitch.dataset.playerPositions??'{}')});requestAnimationFrame(watch);};requestAnimationFrame(watch);});
 await page.locator('#start').click();await page.waitForFunction(()=>['intro','playing'].includes(document.querySelector<HTMLElement>('#pitch')?.dataset.phase??''),undefined,{timeout:30000});
 if(await page.locator('#pitch').getAttribute('data-phase')==='intro')await page.locator('#skip-intro').click();
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(900);await page.keyboard.up('ArrowUp');await page.keyboard.down('ArrowRight');
 // Stop through real controls on the wing: sprinting the entire length outruns
 // the Easy AI and never produces a settled forecheck/cover observation.
 await page.waitForFunction(()=>Number(document.querySelector<HTMLElement>('#pitch')?.dataset.ballPosition?.split(',')[0])>=5.5,undefined,{timeout:6000});
 await page.keyboard.up('ArrowRight');
 try{await expect.poll(()=>page.evaluate(()=>{return (window as unknown as Watch).__coverFrames.some(f=>{
  const d=[f.players['away-2'],f.players['away-4']];if(d.some(p=>!p)||f.owner!=='home-0'||f.ball[0]<=4)return false;
  const distance=(p:{x:number;z:number})=>Math.hypot(p.x-f.ball[0],p.z-f.ball[1]);
  const nearest=['away-0','away-1','away-2','away-4'].map(id=>({id,p:f.players[id]})).sort((a,b)=>distance(a.p)-distance(b.p))[0];
  if(nearest.id==='away-2'||nearest.id==='away-4'){
   const press=nearest.p,cover=d.find(p=>p!==press)!;
   return distance(press)<3.5&&distance(cover)>4&&cover.x-press.x>2&&cover.x-f.ball[0]>3;
  }
  // A midfielder/attacker can legitimately be nearest. In that case BOTH
  // defenders must remain wide and behind the play, not join that pressure.
  return distance(nearest.p)<2.5&&d.every(p=>p.x-f.ball[0]>3)&&Math.abs(d[0].z-d[1].z)>6;
 });}),{timeout:7000}).toBe(true);}finally{await page.keyboard.up('ArrowRight');await info.attach('observed-forecheck-frames.json',{body:JSON.stringify(await page.evaluate(()=>(window as unknown as Watch).__coverFrames)),contentType:'application/json'});}
 await page.locator('#pause').click();await page.screenshot({path:info.outputPath('one-presses-one-covers.png'),fullPage:true});expect(errors).toEqual([]);
});
