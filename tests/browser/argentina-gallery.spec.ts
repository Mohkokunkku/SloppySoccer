import { test, expect, type Page } from '@playwright/test';

const ids = ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10', 'K01', 'K02'] as const;
const outfield = ids.slice(0, 10);
const keepers = ids.slice(10);

test.describe('Argentina adult audition gallery', () => {
  test.setTimeout(45_000);

  async function openGallery(page: Page): Promise<void> {
    const response = await page.goto('/argentina.html');
    expect(response?.status(), 'The production gallery route responds').toBe(200);
    const status = page.locator('#gallery-status');
    await expect(status).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
    await expect(page.locator('#model-viewer canvas')).toBeVisible();
    await expect(page.locator('[data-candidate-id]')).toHaveCount(12);
    await expect(page.locator('#inspector-name')).toBeVisible();
    await expect(page.locator('#inspector-details')).toBeVisible();
  }

  test('all twelve real candidate portraits load and distinguish identities', async ({ page }) => {
    await openGallery(page);
    const portraits = page.locator('[data-candidate-id] img');
    await expect(portraits).toHaveCount(12);
    const images = await portraits.evaluateAll(nodes => nodes.map(node => {
      const image = node as HTMLImageElement;
      return { id: image.closest('[data-candidate-id]')?.getAttribute('data-candidate-id'), complete: image.complete,
        width: image.naturalWidth, height: image.naturalHeight, source: image.currentSrc };
    }));
    expect(images.map(image => image.id)).toEqual(ids);
    expect(images.every(image => image.complete && image.width > 0 && image.height > 0 && image.source.length > 0)).toBe(true);
    const signatures = await portraits.evaluateAll(nodes => nodes.map(node => {
      const image = node as HTMLImageElement;
      const canvas = document.createElement('canvas');
      canvas.width = 24; canvas.height = 24;
      const context = canvas.getContext('2d');
      if (!context) return '';
      try { context.drawImage(image, 0, 0, 24, 24); return [...context.getImageData(0, 0, 24, 24).data].join(','); }
      catch { return ''; }
    }));
    expect(signatures.every(signature => signature.length > 0), 'Portraits must be readable rendered images').toBe(true);
    expect(new Set(signatures).size, 'Portrait thumbnails must not be duplicate recolors/placeholders').toBe(12);
    for (const id of ids) {
      await expect(page.locator(`button[data-inspect="${id}"]`)).toHaveCount(1);
      await expect(page.locator(`button[data-pick="${id}"]`)).toHaveCount(1);
    }
  });

  test('inspector identity, four views, poses and comparisons follow the exposed state contract', async ({ page }) => {
    await openGallery(page);
    const status = page.locator('#gallery-status');
    await page.locator('button[data-inspect="P04"]').click();
    await expect(status).toHaveAttribute('data-selected', 'P04');
    await expect(page.locator('#inspector-name')).toContainText('P04');
    await expect(page.locator('#inspector-details')).not.toBeEmpty();
    for (const view of ['front', 'threequarter', 'profile', 'back']) {
      await page.locator(`button[data-view="${view}"]`).click();
      await expect(status).toHaveAttribute('data-view', view);
    }
    for (const pose of ['idle', 'run', 'ready']) {
      await page.locator(`button[data-pose="${pose}"]`).click();
      await expect(status).toHaveAttribute('data-pose', pose);
    }
    const comparison = page.locator('#compare-model');
    for (const value of ['none', 'spain', 'current-argentina']) {
      await comparison.selectOption(value);
      await expect(status).toHaveAttribute('data-comparison', value);
    }
  });

  test('shortlist enforces four outfield and one replaceable keeper; clear and copy remain draft-only', async ({ page }) => {
    await openGallery(page);
    const summary = page.locator('#selection-summary');
    const output = page.locator('#selection-output');
    const copy = page.locator('#copy-lineup');
    const clear = page.locator('#clear-lineup');
    await expect(copy).toBeDisabled();
    for (const id of outfield.slice(0, 4)) await page.locator(`button[data-pick="${id}"]`).click();
    await expect(summary).toContainText('4');
    const rejected = page.locator('#selection-notice');
    await page.locator('button[data-pick="P05"]').click();
    await expect(rejected).not.toBeEmpty();
    await expect(output).toHaveValue(/P01[\s\S]*P02[\s\S]*P03[\s\S]*P04/);
    await expect(output).not.toHaveValue(/P05/);
    await page.locator('button[data-pick="K01"]').click();
    await expect(copy).toBeEnabled();
    await page.locator('button[data-pick="K02"]').click();
    await expect(output).toHaveValue(/K02/);
    await expect(output).not.toHaveValue(/K01/);
    await copy.click();
    await expect(page.locator('#selection-notice')).not.toBeEmpty();
    await clear.click();
    await expect(output).toHaveValue(/not applied to the game/i);
    await expect(output).toHaveValue(/Outfield: Choose four/);
    await expect(output).toHaveValue(/Goalkeeper: Choose one/);
    await expect(output).not.toHaveValue(/\b(?:P\d{2}|K\d{2})\b/);
    await expect(copy).toBeDisabled();
    await expect(summary).toContainText('0');
  });

  test('face detail, keeper inspection and saved draft work without applying a squad', async ({ page }) => {
    await openGallery(page);
    const canvas=page.locator('#model-viewer canvas');
    const before=await canvas.evaluate(node=>(node as HTMLCanvasElement).toDataURL());
    await page.locator('#face-detail').click();
    await expect(page.locator('#gallery-status')).toHaveAttribute('data-closeup','true');
    expect(await canvas.evaluate(node=>(node as HTMLCanvasElement).toDataURL())).not.toBe(before);
    for(const id of keepers){await page.locator(`button[data-inspect="${id}"]`).click();await expect(page.locator('#inspector-name')).toContainText(id);}
    await page.locator('button[data-view="front"]').click();
    await expect(page.locator('#gallery-status')).toHaveAttribute('data-closeup','false');
    for(const id of ['P02','P04','P07','P10','K02'])await page.locator(`button[data-pick="${id}"]`).click();
    await page.reload();await expect(page.locator('#gallery-status')).toHaveAttribute('data-ready','true');
    await expect(page.locator('#selection-output')).toHaveValue(/P02, P04, P07, P10[\s\S]*K02/);
    await expect(page.locator('#copy-lineup')).toBeEnabled();
    await expect(page.locator('#selection-output')).toHaveValue(/not applied to the game/);
  });

  test('keyboard and phone use native controls without overflow; no match/result mutation or browser errors', async ({ page }) => {
    const errors: string[] = [];
    const resultWrites: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/results') resultWrites.push(request.url());
    });
    await openGallery(page);
    const initialResults = await (await page.request.get('/api/results')).json();
    const initialMatch = await page.evaluate(() => ({
      score: [...document.querySelectorAll('#home-score, #away-score')].map(node => node.textContent),
      phase: document.querySelector('#phase-label')?.textContent,
      clock: document.querySelector('#clock')?.textContent,
    }));
    const inspect = page.locator('button[data-inspect="P02"]');
    await inspect.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#gallery-status')).toHaveAttribute('data-selected', 'P02');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= innerWidth)).toBe(true);
    await expect(page.locator('#model-viewer canvas')).toBeVisible();
    await page.locator('button[data-view="profile"]').click();
    await expect(page.locator('#gallery-status')).toHaveAttribute('data-view', 'profile');
    expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= innerWidth)).toBe(true);
    expect(await page.evaluate(() => ({
      score: [...document.querySelectorAll('#home-score, #away-score')].map(node => node.textContent),
      phase: document.querySelector('#phase-label')?.textContent,
      clock: document.querySelector('#clock')?.textContent,
    }))).toEqual(initialMatch);
    expect(await (await page.request.get('/api/results')).json()).toEqual(initialResults);
    expect(resultWrites, 'Auditioning must never submit a match result').toEqual([]);
    expect(errors, 'No page, console, CSP, or resource errors').toEqual([]);
  });
});
