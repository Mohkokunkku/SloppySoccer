import { expect, type Page } from '@playwright/test';

// Legacy non-cinematic checks use only the production skip control. Natural
// spotlight coverage remains in local-party.spec.ts and does not call this.
export async function waitForPartyPlay(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const phase = document.querySelector<HTMLElement>('#pitch')?.dataset.phase;
    return phase === 'intro' || phase === 'playing';
  }, undefined, { timeout: 30_000 });
  if (await page.locator('#pitch').getAttribute('data-phase') === 'intro') {
    await page.locator('#skip-intro').click();
  }
  await expect(page.locator('#pitch')).toHaveAttribute('data-phase', 'playing');
  await expect(page.locator('#phase-label')).toHaveText('In play');
}

export async function startPartyMatch(page: Page): Promise<void> {
  await page.locator('#start').click();
  await waitForPartyPlay(page);
}
