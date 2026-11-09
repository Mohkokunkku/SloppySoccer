import { test, expect, type Page } from '@playwright/test';
import { startPartyMatch } from './party-helpers';

// Production DOM and native browser input only. Execute after coordinator rebuild.
async function restoreNativeFocus(page:Page):Promise<void>{
  // Playwright's Chromium initialization forces focus emulation (coreBundle.js).
  // Disable that test-framework override; do not synthesize hidden/blur events.
  const session=await page.context().newCDPSession(page);
  await session.send('Emulation.setFocusEmulationEnabled',{enabled:false});
}
async function open(page: Page): Promise<void> {
  expect((await page.goto('/'))?.status()).toBe(200);
  await expect(page.locator('#pitch canvas')).toBeVisible();
  await expect(page.locator('#pitch')).toHaveAttribute('data-phase', 'ready');
}

async function audition(page: Page): Promise<void> {
  await page.locator('#sound-toggle').click();
  await expect(page.locator('#sound-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Hear goal music', exact: true }).click();
  await expect.poll(async () => Number(await page.locator('#sound-toggle').getAttribute('data-active'))).toBeGreaterThan(0);
}

async function cancelled(page: Page): Promise<void> {
  const sound = page.locator('#sound-toggle');
  await expect(sound).toHaveAttribute('data-active', '0');
  await expect(sound).toHaveAttribute('data-pending', '0');
  // A bounded observation window, not a settling sleep: reject any late start.
  const result = await page.evaluate(async () => {
    const button = document.querySelector<HTMLElement>('#sound-toggle')!;
    const played = button.dataset.played;
    const deadline = performance.now() + 2000;
    do {
      if (button.dataset.active !== '0' || button.dataset.pending !== '0' || button.dataset.played !== played) return false;
      await new Promise(resolve => setTimeout(resolve, 25));
    } while (performance.now() < deadline);
    return true;
  });
  expect(result, 'No active, pending, or delayed playback after suspension').toBe(true);
  await expect(page.locator('#pitch')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('#audio-status')).toBeEmpty();
}

test('READY goal audition cancels on actual alternate-tab visibility hide', async ({ page, context }) => {
  await open(page);
  await restoreNativeFocus(page);await page.bringToFront();
  await audition(page);
  const alternate = await context.newPage();
  try {
    await alternate.goto('about:blank');
    await alternate.bringToFront();
    // Do not substitute a synthetic visibilitychange or call blur "hidden".
    // A host that cannot hide native tabs must report this prerequisite failure.
    const canHide=await expect.poll(() => page.evaluate(() => document.visibilityState),{timeout:1500}).toBe('hidden').then(()=>true,()=>false);
    test.skip(!canHide,'Runner forces native page visibility; active/pending cancellation is covered by deterministic suspension tests. No real hidden-tab pass is claimed.');
    await page.bringToFront();
    await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe('visible');
    await cancelled(page);
  } finally { await alternate.close(); }
});

test('READY goal audition cancels on native browser window blur', async ({ page, context }) => {
  await open(page);
  await restoreNativeFocus(page);await page.bringToFront();
  await audition(page);
  const alternate = await context.newPage();
  try {
    await alternate.goto('about:blank');
    await alternate.bringToFront();
    const canBlur=await expect.poll(() => page.evaluate(() => document.hasFocus()),{timeout:1500}).toBe(false).then(()=>true,()=>false);
    test.skip(!canBlur,'Runner forces native document focus; suspension logic is covered in all phases by deterministic tests. No real native-blur pass is claimed.');
    await page.bringToFront();
    await cancelled(page);
  } finally { await alternate.close(); }
});

test('native shot rotation survives a paused geometry rebuild', async ({ page }) => {
  await open(page);
  await page.locator('#tuning-panel summary').click();
  await startPartyMatch(page);
  await page.locator('#pitch').focus();
  await page.keyboard.press('Space');
  // Inspect and pause in one browser task, rather than racing remote round trips.
  await page.waitForFunction(() => {
    const pitch = document.querySelector<HTMLElement>('#pitch')!;
    const rotation = pitch.dataset.ballRotation?.split(',').map(Number);
    if (pitch.dataset.phase !== 'playing' || !rotation?.every(Number.isFinite) || !rotation.some(n => Math.abs(n) > 0.001)) return false;
    document.querySelector<HTMLButtonElement>('#pause')!.click();
    return true;
  }, undefined, { timeout: 8000 });
  await expect(page.locator('#phase-label')).toHaveText('Paused');
  // Two rendered frames present the paused state without advancing simulation.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const pitch = page.locator('#pitch');
  const rotation = await pitch.getAttribute('data-ball-rotation');
  expect(rotation!.split(',').some(n => Math.abs(Number(n)) > 0.001)).toBe(true);
  const rebuilds = Number(await pitch.getAttribute('data-board-rebuilds'));
  await page.locator('#tune-fieldWidth').press('ArrowRight');
  await expect.poll(async () => Number(await pitch.getAttribute('data-board-rebuilds'))).toBeGreaterThan(rebuilds);
  await expect(pitch).toHaveAttribute('data-ball-rotation', rotation!);
  await expect(page.locator('#phase-label')).toHaveText('Paused');
});

for (const key of ['End', 'Home']) {
  test(`early entering fieldHeight ${key} keeps original tunnel anchor and frozen clock`, async ({ page }) => {
    await open(page);
    await page.locator('#tuning-panel summary').click();
    const clock = await page.locator('#clock').innerText();
    const originalHeight = await page.locator('#pitch').getAttribute('data-field-height');
    // Freeze immediately through production controls, before automation can miss entry.
    await page.evaluate(() => {
      document.querySelector<HTMLButtonElement>('#start')!.click();
      document.querySelector<HTMLButtonElement>('#pause')!.click();
    });
    const pitch = page.locator('#pitch');
    await expect(pitch).toHaveAttribute('data-phase', 'entering');
    await page.locator('#tune-fieldHeight').press(key);
    await expect(pitch).toHaveAttribute('data-field-height', key === 'End' ? '30' : '12');
    await expect(pitch).toHaveAttribute('data-entry-anchor-height', originalHeight!);
    await page.locator('#resume').click();
    const result = await page.evaluate(async ({ clock, originalHeight }) => {
      const pitch = document.querySelector<HTMLElement>('#pitch')!;
      const deadline = performance.now() + 30_000;
      let samples = 0;
      while (performance.now() < deadline) {
        if (pitch.dataset.phase === 'playing' || pitch.dataset.phase === 'intro') return { complete: true, samples };
        if (pitch.dataset.phase !== 'entering') throw new Error(`Unexpected phase ${pitch.dataset.phase}`);
        if (document.querySelector('#clock')!.textContent !== clock) throw new Error('Entrance advanced match clock');
        if (pitch.dataset.entryAnchorHeight !== originalHeight) throw new Error('Entrance anchor moved with live geometry');
        const count = Number(pitch.dataset.entryCount);
        if (!Number.isInteger(count) || count < 0 || count > 10) throw new Error(`Invalid entry count ${count}`);
        samples++;
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      }
      return { complete: false, samples };
    }, { clock, originalHeight });
    expect(result.complete, 'Entrance completes within 30 seconds under live geometry').toBe(true);
    expect(result.samples).toBeGreaterThan(0);
    await expect(pitch).toHaveAttribute('data-entry-count', '0');
    await expect(page.locator('#home-score')).toHaveText('0');
    await expect(page.locator('#away-score')).toHaveText('0');
  });
}
