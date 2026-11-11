import {test as base,expect} from '@playwright/test';
import {startPartyMatch} from './party-helpers';
const test=base.extend<{runtime:void}>({runtime:[async({page},use)=>{const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await use();expect(errors).toEqual([]);},{auto:true}]});

test('enlarged defaults, illustrated bindings and native keyboard/drag team tokens',async({page})=>{
 await page.goto('/');await expect(page.locator('#pitch')).toHaveAttribute('data-field-width','35.2');await expect(page.locator('#pitch')).toHaveAttribute('data-field-height','22');
 await page.locator('#tuning-panel summary').click();await expect(page.locator('#tune-sprintMultiplier')).toHaveValue('1.15');
 const token=page.locator('#seat-p1-token');await expect(page.locator('#team-home-zone #seat-p1-token')).toBeVisible();
 await token.focus();await token.press('Enter');await expect(page.locator('#seat-p1-team')).toHaveValue('away');await expect(page.locator('#team-away-zone #seat-p1-token')).toBeVisible();
 await token.press('Space');await expect(page.locator('#seat-p1-team')).toHaveValue('home');
 await token.dragTo(page.locator('#team-away-zone'));await expect(page.locator('#seat-p1-team')).toHaveValue('away');
 await token.click();await expect(page.locator('#seat-p1-team')).toHaveValue('home');
 await expect(page.locator('#local-control-guide img')).toHaveCount(3);
 for(const image of await page.locator('#local-control-guide img').all())expect(await image.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0&&i.alt.length>20)).toBe(true);
 await page.screenshot({path:test.info().outputPath('graphical-lobby-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:test.info().outputPath('graphical-lobby-phone.png'),fullPage:true});
});

test('real keyboard hold fills the authorized meter, release shoots, pause cancels',async({page})=>{
 await page.goto('/');await page.locator('#seat-p2-enabled').check();await page.locator('#seat-p2-device').selectOption('keyboard2');
 // Observe renderer diagnostics only; do not inject or replace game state.
 await page.locator('#pitch').evaluate(node=>{const w=window as unknown as {shotReleases:{type:string;playerId:string}[]};w.shotReleases=[];new MutationObserver(()=>{const r=JSON.parse(node.getAttribute('data-ball-release')??'null');if(r)w.shotReleases.push(r);}).observe(node,{attributes:true,attributeFilter:['data-ball-release']});});
 await startPartyMatch(page);
 await page.keyboard.down('KeyA');await page.keyboard.down('Space');
 const meter=page.locator('.kick-meter[data-seat="p1"]');await expect(meter).toHaveAttribute('data-charging','true');
 await expect.poll(async()=>Number(await meter.locator('[role="progressbar"]').getAttribute('aria-valuenow'))).toBeGreaterThan(25);
 await meter.screenshot({path:test.info().outputPath('charged-kick.png')});
 // Aim across the pitch, not backwards into our keeper's immediate clearance.
 await page.keyboard.up('KeyA');await page.keyboard.down('KeyW');await page.keyboard.up('Space');
 await expect.poll(()=>page.evaluate(()=>{
  const releases=(window as unknown as {shotReleases:{type:string;playerId:string}[]}).shotReleases;
  return releases.some(r=>r.type==='shot'&&r.playerId==='home-0');
 })).toBe(true);await expect(meter).toHaveAttribute('data-charging','false');
 await page.keyboard.up('KeyW');
 await page.locator('#restart').click();await expect(page.locator('#skip-intro')).toBeVisible({timeout:30000});await page.locator('#skip-intro').click();
 await page.keyboard.down('Space');await expect(meter).toHaveAttribute('data-charging','true');await page.keyboard.press('Escape');await page.keyboard.up('Space');
 await expect(page.locator('#phase-label')).toHaveText('Paused');await expect(meter).toHaveAttribute('data-charging','false');
 await page.locator('#resume').click();await page.waitForTimeout(150);await expect(page.locator('#pitch')).toHaveAttribute('data-ball-release','null');
});

for(const [theme,name]of ['Golden Boot','The Grandstand','After the Whistle'].entries())test(`victory theme ${theme} renders real cameras, dancers, pause and optional native audio`,async({page})=>{
 test.setTimeout(45000);await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/victory.html');
 if(theme===1)await page.locator('#victory-result').selectOption('away');
 await page.locator('#victory-sound').click();await page.getByRole('button',{name,exact:true}).click();
 const pitch=page.locator('#victory-pitch'),sound=page.locator('#victory-sound');
 await expect(pitch).toHaveAttribute('data-post-match-theme',String(theme));await expect(pitch).toHaveAttribute('data-post-match-winner',theme===1?'away':'home');await expect(pitch).toHaveAttribute('data-camera-mode','post-match');
 await expect.poll(async()=>Number(await sound.getAttribute('data-active'))).toBeGreaterThan(0);
 const before=await pitch.getAttribute('data-player-positions');await expect.poll(()=>pitch.getAttribute('data-player-positions')).not.toBe(before);
 await page.screenshot({path:test.info().outputPath(`victory-${theme}-faces.png`),fullPage:true});
 await page.locator('#victory-pause').click();const frozen=await pitch.getAttribute('data-player-positions'),time=await pitch.getAttribute('data-post-match-elapsed');await page.waitForTimeout(250);
 expect(await pitch.getAttribute('data-player-positions')).toBe(frozen);expect(await pitch.getAttribute('data-post-match-elapsed')).toBe(time);await expect(sound).toHaveAttribute('data-active','0');
 await page.locator('#victory-pause').click();
 if(theme===0){await expect(pitch).toHaveAttribute('data-post-match-segment','losers',{timeout:10000});await page.screenshot({path:test.info().outputPath('victory-losers.png'),fullPage:true});await expect(pitch).toHaveAttribute('data-post-match-segment','finale',{timeout:6000});await page.screenshot({path:test.info().outputPath('victory-finale.png'),fullPage:true});}
 await page.locator('#victory-skip').click();await expect(pitch).toHaveAttribute('data-post-match-active','false');await expect(sound).toHaveAttribute('data-active','0');await expect(sound).toHaveAttribute('data-pending','0');
});

test('draw and reduced motion are neutral, finish naturally and decode all supplied clips',async({page})=>{
 test.setTimeout(30000);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/victory.html');await page.locator('#victory-result').selectOption('draw');
 const pitch=page.locator('#victory-pitch');await expect(pitch).toHaveAttribute('data-post-match-segment','draw');await expect(pitch).toHaveAttribute('data-post-match-winner','draw');await expect(pitch).toHaveAttribute('data-camera-mode','wide');
 await expect(pitch).toHaveAttribute('data-post-match-active','false',{timeout:12000});
 const decoded=await page.evaluate(async()=>{const c=new AudioContext();try{return await Promise.all(['theme-0','theme-1','theme-2','cheer-yeah','cheer-we-did-it','cheer-champions'].map(async name=>{const r=await fetch('/audio-v3/'+name+'.wav');if(!r.ok)throw Error(name);const b=await c.decodeAudioData(await r.arrayBuffer());return {name,duration:b.duration};}));}finally{await c.close();}});
 expect(decoded).toHaveLength(6);for(const clip of decoded)expect(clip.duration).toBeGreaterThan(.2);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
