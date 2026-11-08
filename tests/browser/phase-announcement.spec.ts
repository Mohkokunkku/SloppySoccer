import { test, expect } from '@playwright/test';

test('live announcer follows real entrance, spotlight, Skip intro and pause/resume', async ({ page }) => {
  await page.goto('/');
  const announcer = page.locator('#announcer');
  await expect(announcer).toHaveAttribute('aria-live', 'polite');
  // Observe only real live-region DOM mutations; no engine, clock or graphics hooks.
  await announcer.evaluate(node => {
    node.setAttribute('data-observed-announcements', '[]');
    new MutationObserver(() => {
      const history = JSON.parse(node.getAttribute('data-observed-announcements') ?? '[]') as string[];
      history.push(node.textContent ?? '');
      node.setAttribute('data-observed-announcements', JSON.stringify(history));
    }).observe(node, { childList: true, characterData: true, subtree: true });
  });
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(page.locator('#phase-label')).toHaveText('Teams entering');
  await expect(announcer).toHaveText('Both teams are entering the pitch.');
  await expect(page.locator('#phase-label')).toHaveText('Team spotlight', { timeout: 30_000 });
  await expect(announcer).toHaveText('Team spotlight. Meet both teams; Skip intro is available.');
  await expect(page.locator('#skip-intro')).toBeVisible();
  await page.locator('#skip-intro').click();
  await expect(page.locator('#phase-label')).toHaveText('In play');
  await expect(announcer).toHaveText('Match in play. P1 Spain →');
  await page.locator('#pause').click();
  await expect(announcer).toHaveText('Match paused.');
  await page.locator('#resume').click();
  await expect(announcer).toHaveText('Match in play. P1 Spain →');
  // Sample actual RAFs rather than advancing/replacing simulation time.
  await page.evaluate(async () => {
    for (let frame = 0; frame < 12; frame++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  });
  const history = JSON.parse(await announcer.getAttribute('data-observed-announcements') ?? '[]');
  expect(history).toEqual([
    'Both teams are entering the pitch.',
    'Team spotlight. Meet both teams; Skip intro is available.',
    'Match in play. P1 Spain →',
    'Match paused.',
    'Match in play. P1 Spain →',
  ]);
});
