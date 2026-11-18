import {test,expect} from '@playwright/test';
type Bed={duration:number;channels:number;fingerprint:number};
type Evidence={__victoryBeds:Bed[]};
test('both real winning anthems play across all dances; draws, pause and skip stay neutral/quiet',async({page})=>{
 const errors:string[]=[],requests:string[]=[],posts:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/audio-'))requests.push(new URL(r.url()).pathname);if(r.method()==='POST')posts.push(r.url());});
 await page.addInitScript(()=>{
  const evidence=window as unknown as Evidence;evidence.__victoryBeds=[];
  const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(this:AudioBufferSourceNode,...args:Parameters<AudioBufferSourceNode['start']>){
   if(this.loop&&this.buffer){const data=this.buffer.getChannelData(0);let fingerprint=0;
    for(let i=0;i<data.length;i+=997)fingerprint=((fingerprint*31)^Math.round(data[i]*32767))|0;
    evidence.__victoryBeds.push({duration:this.buffer.duration,channels:this.buffer.numberOfChannels,fingerprint});}
   return start.apply(this,args);
  };
 });
 await page.goto('/victory.html');await page.locator('#victory-result').selectOption('home');await page.locator('#victory-sound').click();
 const sound=page.locator('#victory-sound'),status=page.locator('#victory-status');
 const beds=()=>page.evaluate(()=>(window as unknown as Evidence).__victoryBeds);
 for(const [winner,title,path] of [['home','Marcha Real','/audio-v5/spain-toy-pop.wav'],['away','Himno Nacional Argentino','/audio-v5/argentina-toy-pop.wav']] as const){
  await page.locator('#victory-result').selectOption(winner);
  for(const name of ['Golden Boot','The Grandstand','After the Whistle']){
   const before=(await beds()).length;await page.getByRole('button',{name,exact:true}).click();await expect(status).toContainText(title);
   await expect.poll(async()=>(await beds()).length).toBeGreaterThan(before);
   expect((await beds()).at(-1)!.duration).toBeGreaterThan(20);expect((await beds()).at(-1)!.channels).toBe(2);
  }
  expect(requests).toContain(path);await expect.poll(async()=>Number(await sound.getAttribute('data-active'))).toBeGreaterThan(0);
 }
 const winningBeds=await beds();expect(new Set(winningBeds.map(b=>b.fingerprint)).size).toBe(2);
 await page.locator('#victory-pause').click();await expect(sound).toHaveAttribute('data-active','0');
 const beforeResume=(await beds()).length;await page.locator('#victory-pause').click();await expect.poll(async()=>(await beds()).length).toBeGreaterThan(beforeResume);
 await page.locator('#victory-skip').click();await expect(sound).toHaveAttribute('data-active','0');
 const beforeDraw=(await beds()).length;await page.locator('#victory-result').selectOption('draw');await expect.poll(async()=>(await beds()).length).toBeGreaterThan(beforeDraw);
 await expect(status).toContainText('Honours even');expect((await beds()).at(-1)!.duration).toBeLessThan(20);expect(requests).toContain('/audio-v3/theme-2.wav');
 await page.locator('#victory-sound').click();await expect(sound).toHaveAttribute('data-active','0');expect(posts).toEqual([]);expect(errors).toEqual([]);
});
test('both shipped toy-pop recordings decode natively as distinct unclipped stereo music',async({page})=>{
 await page.goto('/victory.html');
 const clips=await page.evaluate(async()=>{const c=new AudioContext();try{return await Promise.all(['/audio-v5/spain-toy-pop.wav','/audio-v5/argentina-toy-pop.wav'].map(async path=>{
  const response=await fetch(path);if(!response.ok)throw Error(`${path}: ${response.status}`);const bytes=await response.arrayBuffer();
  const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  const buffer=await c.decodeAudioData(bytes);let peak=0,energy=0;for(let channel=0;channel<buffer.numberOfChannels;channel++)for(const sample of buffer.getChannelData(channel)){peak=Math.max(peak,Math.abs(sample));energy+=sample*sample;}
  return {path,sha256,duration:buffer.duration,channels:buffer.numberOfChannels,peak,rms:Math.sqrt(energy/(buffer.length*buffer.numberOfChannels))};
 }));}finally{await c.close();}});
 expect(clips).toHaveLength(2);expect(clips[0].sha256).not.toBe(clips[1].sha256);
 for(const clip of clips){expect(clip.channels).toBe(2);expect(clip.duration).toBeGreaterThan(20);expect(clip.duration).toBeLessThan(45);expect(clip.peak).toBeGreaterThan(.1);expect(clip.peak).toBeLessThan(.99);expect(clip.rms).toBeGreaterThan(.03);}
});
