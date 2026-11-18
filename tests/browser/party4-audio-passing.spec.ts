import {test,expect} from '@playwright/test';
test('exact stronger default passing power is preserved by the live slider and reset',async({page})=>{
 await page.goto('/');await page.locator('#tuning-panel summary').click();const pass=page.getByLabel('Pass power',{exact:true});await expect(pass).toHaveValue('17.25');await expect(pass).toHaveAttribute('step','0.25');
 await pass.fill('12');await pass.dispatchEvent('input');await page.getByRole('button',{name:'Reset tuning',exact:true}).click();await expect(pass).toHaveValue('17.25');
});
test('native playback fetches cache-versioned human cheers and all five real vocal WAVs decode',async({page})=>{
 const errors:string[]=[],voices:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('cheer-'))voices.push(new URL(r.url()).pathname+new URL(r.url()).search);});
 await page.goto('/victory.html');await page.locator('#victory-sound').click();const sound=page.locator('#victory-sound');
 for(const name of ['Golden Boot','The Grandstand','After the Whistle']){await page.getByRole('button',{name,exact:true}).click();await expect.poll(async()=>Number(await sound.getAttribute('data-active'))).toBeGreaterThan(0);}
 for(const file of ['cheer-yeah','cheer-we-did-it','cheer-champions'])await expect.poll(()=>voices.includes(`/audio-v3/${file}.wav?v=human-v1`)).toBe(true);
 const clips=await page.evaluate(async()=>{const c=new AudioContext();try{return await Promise.all(['/audio-v2/voice-go.wav?v=human-v1','/audio-v2/voice-yes.wav?v=human-v1','/audio-v3/cheer-yeah.wav?v=human-v1','/audio-v3/cheer-we-did-it.wav?v=human-v1','/audio-v3/cheer-champions.wav?v=human-v1'].map(async path=>{const r=await fetch(path);if(!r.ok)throw Error(path);const b=await c.decodeAudioData(await r.arrayBuffer()),s=b.getChannelData(0);return {path,duration:b.duration,peak:s.reduce((m,v)=>Math.max(m,Math.abs(v)),0)};}));}finally{await c.close();}});
 expect(clips).toHaveLength(5);for(const c of clips){expect(c.duration).toBeGreaterThan(.3);expect(c.peak).toBeGreaterThan(.01);expect(c.peak).toBeLessThan(1);}
 await page.locator('#victory-skip').click();await expect(sound).toHaveAttribute('data-active','0');expect(errors).toEqual([]);
});
