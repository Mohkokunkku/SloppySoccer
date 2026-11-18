import { test, expect } from '@playwright/test';
import { startPartyMatch } from './party-helpers';

test('charged role badge grows, announces release, and clears on release or pause', async ({ page }) => {
  await page.goto('/');
  await page.locator('#seat-p2-enabled').check();
  await page.locator('#seat-p2-device').selectOption('keyboard2');
  const badge = page.locator('.role-marker[data-seat="p1"]');
  const letter=await badge.textContent();
  // Observe real rendered progress; a fast 0.6s meter may already be full after several browser assertions.
  await badge.evaluate(node=>{const samples:{percent:number;background:string}[]=[];(window as unknown as {roleSamples:typeof samples}).roleSamples=samples;new MutationObserver(()=>{if(node.getAttribute('data-charging')==='true')samples.push({percent:Number(node.getAttribute('data-charge-percent')),background:(node as HTMLElement).style.background});}).observe(node,{attributes:true,attributeFilter:['data-charge-percent']});});
  await startPartyMatch(page);
  await page.keyboard.down('KeyA');
  await page.keyboard.down('Space');
  await expect(badge).toHaveAttribute('data-charging', 'true');
  await expect(badge).toHaveAttribute('aria-label', /shot power \d+ percent, release to kick/i);
  await expect.poll(()=>page.evaluate(()=>{const s=(window as unknown as {roleSamples:{percent:number;background:string}[]}).roleSamples;return s.length>1&&s.some(p=>p.percent>s[0].percent&&p.background.length>0);})).toBe(true);
  await page.screenshot({path:test.info().outputPath('on-player-charge.png'),fullPage:true});
  await page.keyboard.up('KeyA');await page.keyboard.down('KeyW');await page.keyboard.up('Space');await page.keyboard.up('KeyW');
  await expect(badge).toHaveAttribute('data-charging', 'false');
  await expect(badge).toHaveText(letter!);
  // A released shot leaves the owner. Restart normally for a fresh authorized pause boundary.
  await page.locator('#restart').click();await expect(page.locator('#skip-intro')).toBeVisible({timeout:30000});await page.locator('#skip-intro').click();
  await page.keyboard.down('Space');
  await expect(badge).toHaveAttribute('data-charging', 'true');
  await page.keyboard.press('Escape');
  await page.keyboard.up('Space');
  await expect(page.locator('#phase-label')).toHaveText('Paused');
  await expect(badge).toHaveAttribute('data-charging', 'false');
  await expect(badge).toHaveText(letter!);
});

test('shot charge tuning exposes limits and reset restores its default', async ({ page }) => {
  await page.goto('/');
  await page.locator('#tuning-panel summary').click();
  const slider = page.getByLabel('Shot charge time');
  await expect(slider).toHaveAttribute('type', 'range');
  await expect(slider).toHaveAttribute('min', '0.2');
  await expect(slider).toHaveAttribute('max', '2');
  await expect(slider).toHaveAttribute('step', '0.05');
  await expect(slider).toHaveValue('0.6');
  await slider.fill('0.2');
  await slider.dispatchEvent('input');
  await expect(slider).toHaveValue('0.2');
  await page.getByRole('button', { name: 'Reset tuning' }).click();
  await expect(slider).toHaveValue('0.6');
});

test('keyboard activation of Sound toggles once without moving focus or charging', async ({ page }) => {
  await page.goto('/');
  await page.locator('#seat-p2-enabled').check();
  await page.locator('#seat-p2-device').selectOption('keyboard2');
  await startPartyMatch(page);

  const sound = page.locator('#sound-toggle');
  const badge = page.locator('.role-marker[data-seat="p1"]');
  await sound.focus();
  await page.keyboard.press('Space');
  await expect(sound).toBeFocused();
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await expect(badge).toHaveAttribute('data-charging', 'false');
  await page.keyboard.press('Enter');
  await expect(sound).toBeFocused();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await expect(badge).toHaveAttribute('data-charging', 'false');
});

test('mouse Sound click while paused leaves the pause panel open without focusing canvas', async ({ page }) => {
  await page.goto('/');
  await page.locator('#seat-p2-enabled').check();
  await page.locator('#seat-p2-device').selectOption('keyboard2');
  await startPartyMatch(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('#phase-label')).toHaveText('Paused');
  await expect(page.locator('#paused-actions')).toBeVisible();

  const sound = page.locator('#sound-toggle');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#paused-actions')).toBeVisible();
  await expect(page.locator('#pitch canvas')).not.toBeFocused();
});