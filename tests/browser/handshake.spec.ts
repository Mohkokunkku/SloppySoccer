import {test,expect} from '@playwright/test';
test.use({video:'on'});
for(const result of ['home','away','draw'] as const)test(`fair-play line: ${result} result greets every opponent, pauses and never saves rehearsal scores`,async({page,request})=>{
 test.setTimeout(75000);const errors:string[]=[],posts:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/api/results'))posts.push(r.url());});
 const before=await(await request.get('/api/results')).json();await page.emulateMedia({reducedMotion:result==='draw'?'reduce':'no-preference'});await page.goto('/victory.html');
 await page.locator('#victory-result').selectOption(result);await page.getByRole('button',{name:result==='away'?'After the Whistle':'Golden Boot',exact:true}).click();
 const pitch=page.locator('#victory-pitch');await expect(pitch).toHaveAttribute('data-post-match-winner',result);
 await expect(pitch).toHaveAttribute('data-post-match-segment','handshake',{timeout:26000});
 await expect(pitch).toHaveAttribute('data-handshake-step','shake',{timeout:5000});
 let first:{homeId:string;awayId:string;handDistance:number}[]=[];
 await expect.poll(async()=>{first=await pitch.evaluate(node=>JSON.parse(node.getAttribute('data-handshake-pairs')||'[]'));return first.length>0&&first.every(p=>p.handDistance<=.12);},{timeout:5000}).toBe(true);
 await page.locator('#victory-pause').click();const frozen=await pitch.getAttribute('data-player-positions'),contacts=await pitch.getAttribute('data-handshake-pairs'),time=await pitch.getAttribute('data-post-match-elapsed');await page.waitForTimeout(250);expect(await pitch.getAttribute('data-player-positions')).toBe(frozen);expect(await pitch.getAttribute('data-handshake-pairs')).toBe(contacts);expect(await pitch.getAttribute('data-post-match-elapsed')).toBe(time);
 await page.screenshot({path:test.info().outputPath(`fair-play-${result}-first.png`),fullPage:true});await page.locator('#victory-pause').click();
 await expect.poll(async()=>JSON.parse(await pitch.getAttribute('data-fair-play-completed-pairs')||'[]').length,{timeout:25000}).toBe(25);
 const completed: {homeId:string;awayId:string}[]=JSON.parse(await pitch.getAttribute('data-fair-play-completed-pairs')||'[]');expect(new Set(completed.map(p=>p.homeId+':'+p.awayId)).size).toBe(25);
 for(let i=0;i<5;i++){expect(completed.filter(p=>p.homeId===`home-${i}`)).toHaveLength(5);expect(completed.filter(p=>p.awayId===`away-${i}`)).toHaveLength(5);}
 await page.screenshot({path:test.info().outputPath(`fair-play-${result}-last.png`),fullPage:true});
 await expect(pitch).toHaveAttribute('data-post-match-active','false',{timeout:7000});await expect(pitch).toHaveAttribute('data-handshake-pairs','[]');expect(posts).toHaveLength(0);expect(await(await request.get('/api/results')).json()).toEqual(before);expect(errors).toEqual([]);
});
