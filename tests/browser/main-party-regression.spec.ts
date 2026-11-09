import { test, expect, type Page } from '@playwright/test';
import { startPartyMatch, waitForPartyPlay } from './party-helpers';

async function bindings(page: Page): Promise<string> {
  const value = await page.locator('#pitch').getAttribute('data-controlled-players');
  expect(value).not.toBeNull();
  return value!;
}

for (const restart of ['restart', 'paused-restart']) {
  test(`non-default settings survive ${restart}`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: '1 min', exact: true }).check();
    await page.getByRole('radio', { name: 'Hard', exact: true }).check();
    await startPartyMatch(page);
    if (restart === 'paused-restart') await page.locator('#pause').click();
    await page.locator(`#${restart}`).click();
    // Inspect the actual new clock while entrance freezes simulation time.
    await expect(page.locator('#clock')).toHaveText('1:00');
    await expect(page.locator('input[name="difficulty"]:checked')).toHaveValue('hard');
    await waitForPartyPlay(page);
    await page.locator('#change-players').click();
    await expect(page.getByRole('radio', { name: 'Hard', exact: true })).toBeChecked();
    await expect(page.getByRole('radio', { name: '1 min', exact: true })).toBeChecked();
  });
}

test('setup keyboard controls do not switch a player or pause the match', async ({ page }) => {
  await page.goto('/');
  const before = await bindings(page);
  await page.locator('#formation-home').focus();
  for (const key of ['q', 'e', 'Escape', 'ArrowDown']) await page.keyboard.press(key);
  await expect(page.locator('#pitch')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('#phase-label')).toHaveText('Kick-off');
  await expect(page.locator('#pitch')).toHaveAttribute('data-controlled-players', before);
  await startPartyMatch(page);
  await expect(page.locator('#pitch')).toHaveAttribute('data-controlled-players', before);
  await page.keyboard.press('q');
  await expect(page.locator('#pitch')).not.toHaveAttribute('data-controlled-players', before);
});

test('held switch is cleared across pause and setup reset until release', async ({ page }) => {
  await page.goto('/');
  await startPartyMatch(page);
  const before = await bindings(page);
  await page.keyboard.down('q');
  try {
    await expect(page.locator('#pitch')).not.toHaveAttribute('data-controlled-players', before);
    await page.locator('#pause').click();
    const paused = await bindings(page);
    await page.locator('#resume').click();
    // Observe real rendered frames; do not replace timers or simulation.
    await page.waitForTimeout(500);
    await expect(page.locator('#pitch')).toHaveAttribute('data-controlled-players', paused);
    await page.locator('#change-players').click();
    await startPartyMatch(page);
    await expect(page.locator('#pitch')).toHaveAttribute('data-controlled-players', before);
  } finally {
    await page.keyboard.up('q');
  }
  await page.keyboard.press('q');
  await expect(page.locator('#pitch')).not.toHaveAttribute('data-controlled-players', before);
});
