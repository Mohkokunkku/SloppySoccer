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
  await expect(page.locator('#phase-label')).toHaveText('In play');
  expect(posts).toHaveLength(1);
});

test('shows the selected tactical role and updates it when switching players',async({page})=>{
  await page.goto('/');
  await expect(page.locator('#controlled-role')).toHaveText('Attacker');
  await expect(page.locator('#controlled-role')).toHaveAttribute('title','Find space ahead for a pass.');
  await page.getByRole('button',{name:'Start match'}).click();
  await page.keyboard.press('q');
  await expect(page.locator('#controlled-role')).toHaveText(/Midfielder|Defender/);
});
test('visual design board is served alongside the production game',async({page})=>{
  await page.goto('/design-board.html');
  await expect(page.locator('svg[role="img"]').first()).toBeVisible();
  await page.screenshot({path:'test-results/sloppy-soccer-design.png',fullPage:true});
});
