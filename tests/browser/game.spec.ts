import { test,expect } from '@playwright/test';
test('production game renders WebGL and starts, pauses and resumes a match',async({page,request})=>{
  const errors:string[]=[]; page.on('pageerror',error=>errors.push(error.message));
  expect((await request.get('/api/health')).ok()).toBeTruthy();
  await page.goto('/');
  await expect(page).toHaveTitle(/Sloppy Soccer/);
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button',{name:/kick.?off|start match|play match/i}).first().click();
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300); await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Space');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:/resume|continue/i}).first()).toBeVisible();
  await page.getByRole('button',{name:/resume|continue/i}).first().click();
  await expect(page.getByRole('button',{name:/pause/i}).first()).toBeVisible();
  await page.screenshot({path:'test-results/sloppy-soccer-desktop.png',fullPage:true});
  expect(errors).toEqual([]);
});
test('phone layout has no horizontal overflow and still renders the field',async({page})=>{
  await page.setViewportSize({width:390,height:844}); await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/sloppy-soccer-mobile.png',fullPage:true});
});
test('a complete one-minute match saves exactly once to the real backend', async({page,request}) => {
  test.setTimeout(150_000);
  const posts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/results')) posts.push(request.postData() ?? ''); });
  await page.goto('/');
  await page.getByRole('radio', { name:'1 min', exact:true }).check();
  await page.getByRole('button', {name:'Start match'}).click();
  await expect(page.locator('#phase-label')).toHaveText('Full time', {timeout:130_000});
  await expect(page.locator('#save-status')).toHaveText('Final score saved to the clubhouse.', {timeout:10_000});
  expect(posts).toHaveLength(1);
  const submitted = JSON.parse(posts[0]);
  expect(submitted.duration).toBe(60);
  const stored = await (await request.get('/api/results')).json();
  expect(stored.results.some((row: {duration:number;home:number;away:number}) => row.duration === 60 && row.home === submitted.home && row.away === submitted.away)).toBe(true);
  await page.screenshot({path:'test-results/sloppy-soccer-fulltime.png',fullPage:true});
  await page.getByRole('button', {name:'Play again'}).click();
  await expect(page.locator('#phase-label')).toHaveText('In play', {timeout:30_000});
  expect(posts).toHaveLength(1);
});

test('shows the selected tactical role and updates it when switching players',async({page})=>{
  await page.goto('/');
  await expect(page.locator('#controlled-role')).toHaveText('Attacker');
  await expect(page.locator('#controlled-role')).toHaveAttribute('title','Find space ahead for a pass.');
  await page.getByRole('button',{name:'Start match'}).click();
  await expect(page.locator('#phase-label')).toHaveText('In play',{timeout:30_000});
  await page.keyboard.press('q');
  await expect(page.locator('#controlled-role')).toHaveText(/Midfielder|Defender/);
});
test('shows national teams, eight role markers and working optional audio',async({page,request})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/');
  await expect(page.locator('.team.home')).toContainText('Spain');await expect(page.locator('.team.away')).toContainText('Argentina');
  await expect(page.locator('.role-marker')).toHaveCount(8);
  for(const label of ['A','M','D','GK'])expect(await page.locator('.role-marker').allTextContents()).toContain(label);
  const sound=page.locator('#sound-toggle');await sound.click();await expect(sound).toHaveAttribute('aria-pressed','true');
  await page.locator('#sound-test').click();await expect.poll(async()=>Number(await sound.getAttribute('data-played'))).toBeGreaterThan(0);
  await sound.click();await expect(sound).toHaveAttribute('aria-pressed','false');
  for(const clip of ['pass-me','here','goal']){const response=await request.get('/audio/'+clip+'.wav');expect(response.ok()).toBe(true);expect((await response.body()).length).toBeGreaterThan(1000);}
  expect(errors).toEqual([]);
});
test('rehearses all three real goal dances and jogs back before kick-off',async({page})=>{
  test.setTimeout(80_000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/celebrations.html');
  const status=page.locator('#demo-status');
  for(const [index,name] of ['Boot bounce','Windmill wave','Toy shuffle'].entries()){
    await page.getByRole('button',{name,exact:true}).click();await expect(status).toHaveAttribute('data-phase','goal');await expect(status).toContainText(name);
    await page.waitForTimeout(900);await page.screenshot({path:`test-results/dance-${index}.png`,fullPage:true});
    await expect(status).toHaveAttribute('data-phase','resetting',{timeout:7000});
    await expect(status).toHaveAttribute('data-phase','playing',{timeout:8000});
  }
  await expect(page.locator('.role-marker')).toHaveCount(8);expect(errors).toEqual([]);
});
test('offers three distinct player concepts without applying a character change',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/toybox-concepts.html');
  await expect(page.locator('.concept')).toHaveCount(3);await expect(page.locator('#selection')).toContainText('No option selected');
  await page.getByRole('button',{name:/Choose B/}).click();await expect(page.locator('#selection')).toContainText('B — Workshop Eleven');
  await page.getByRole('button',{name:'Clear preference'}).click();await expect(page.locator('#selection')).toContainText('No option selected');
  await page.screenshot({path:'test-results/toybox-concepts.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('visual design board is served alongside the production game',async({page})=>{
  await page.goto('/design-board.html');
  await expect(page.locator('svg[role="img"]').first()).toBeVisible();
  await page.screenshot({path:'test-results/sloppy-soccer-design.png',fullPage:true});
});
