import {test,expect} from '@playwright/test';
for(const winner of ['home','away'] as const)test(`real victory ending: ${winner} winner greets every opponent, pauses, finishes without a saved rehearsal result`,async({page,request})=>{
 test.setTimeout(40000);const errors:string[]=[],posts:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/api/results'))posts.push(r.url());});
 const before=await(await request.get('/api/results')).json();await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/victory.html');
 if(winner==='away')await page.locator('#victory-result').selectOption('away');
 await page.getByRole('button',{name:winner==='home'?'Golden Boot':'After the Whistle',exact:true}).click();
 const pitch=page.locator('#victory-pitch');await expect(pitch).toHaveAttribute('data-post-match-winner',winner);
 await expect(pitch).toHaveAttribute('data-post-match-segment','handshake',{timeout:22000});
 await expect(pitch).toHaveAttribute('data-handshake-step','shake',{timeout:4000});
 const pairs=await pitch.getAttribute('data-handshake-pairs');const contacts=JSON.parse(pairs||'[]');expect(contacts).toHaveLength(5);for(const p of contacts){expect(p.homeId).toMatch(/^home-/);expect(p.awayId).toMatch(/^away-/);expect(p.handDistance).toBeLessThanOrEqual(.12);}
 await page.locator('#victory-pause').click();const frozen=await pitch.getAttribute('data-handshake-pairs'),elapsed=await pitch.getAttribute('data-post-match-elapsed');await page.waitForTimeout(250);expect(await pitch.getAttribute('data-handshake-pairs')).toBe(frozen);expect(await pitch.getAttribute('data-post-match-elapsed')).toBe(elapsed);
 await page.screenshot({path:test.info().outputPath(`handshake-${winner}.png`),fullPage:true});await page.locator('#victory-pause').click();await expect(pitch).toHaveAttribute('data-post-match-active','false',{timeout:8000});await expect(pitch).toHaveAttribute('data-handshake-pairs','[]');
 expect(posts).toHaveLength(0);expect(await(await request.get('/api/results')).json()).toEqual(before);expect(errors).toEqual([]);
});
