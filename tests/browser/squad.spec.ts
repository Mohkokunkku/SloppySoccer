import { test as base, expect, type Locator, type Page } from '@playwright/test';

// Use the configured production Fastify server, never Vite or mocked scene data.
const test = base.extend<{ runtimeChecks: void }>({
  runtimeChecks: [async ({ page }, use) => {
    const errors: string[] = [];
    const resultWrites: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('request', request => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/results') {
        resultWrites.push(request.url());
      }
    });
    await use();
    expect(errors, 'No JavaScript, CSP or resource-loading errors').toEqual([]);
    expect(resultWrites, 'Previewing and starting must not save a match result').toEqual([]);
  }, { auto: true }],
});

test.describe('production Spain squad', () => {
  test.setTimeout(35_000);

  async function expectWebGL(canvas: Locator): Promise<void> {
    await expect(canvas).toBeVisible();
    await expect.poll(() => canvas.evaluate((node: HTMLCanvasElement) => {
      const context = node.getContext('webgl2') || node.getContext('webgl');
      return !!context && !context.isContextLost()
        && context.drawingBufferWidth > 0 && context.drawingBufferHeight > 0;
    }), { timeout: 5_000, message: 'A live WebGL drawing buffer, not a static illustration' }).toBe(true);
  }

  async function openSquad(page: Page): Promise<Locator> {
    const response = await page.goto('/squad.html');
    expect(response?.status(), 'The built gallery must be served successfully').toBe(200);
    const cards = page.locator('.squad-card[data-character]');
    await expect(cards).toHaveCount(3);
    expect(await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-character')).sort()))
      .toEqual(['A1', 'A2', 'A3']);
    for (const identity of ['A1', 'A2', 'A3']) {
      await expect(page.locator(`.squad-card[data-character="${identity}"]`)).toBeVisible();
    }
    const canvas = page.locator('#squad-canvas canvas');
    await expect(canvas).toHaveCount(1);
    await expectWebGL(canvas);
    await expect(canvas).toHaveAccessibleName(/\S/);
    await expect(page.locator('#squad-status')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('#squad-status')).toHaveAttribute('data-focus', 'all');
    return canvas;
  }

  test('gallery renders three identities and responds to real camera and focus controls', async ({ page }) => {
    const canvas = await openSquad(page);
    const status = page.locator('#squad-status');
    const focus = page.locator('#showcase-focus');
    expect(await focus.locator('option').evaluateAll(nodes => nodes.map(node => (node as HTMLOptionElement).value).sort()))
      .toEqual(['A1', 'A2', 'A3', 'all']);

    await page.locator('button[data-view="front"]').click();
    await expect(status).toHaveAttribute('data-view', 'front');
    const frontImage = await canvas.screenshot();
    for (const view of ['threequarter', 'back']) {
      await page.locator(`button[data-view="${view}"]`).click();
      await expect(status).toHaveAttribute('data-view', view);
    }
    expect((await canvas.screenshot()).equals(frontImage), 'Front and back must render differently').toBe(false);

    const allFiguresImage = await canvas.screenshot();
    for (const identity of ['A1', 'A2', 'A3', 'all']) {
      await focus.selectOption(identity);
      await expect(focus).toHaveValue(identity);
      await expect(status).toHaveAttribute('data-focus', identity);
      if (identity === 'A1') {
        expect((await canvas.screenshot()).equals(allFiguresImage), 'Individual focus must change the rendered gallery').toBe(false);
      }
    }
    await page.locator('button[data-view="threequarter"]').click();
    await expect(status).toHaveAttribute('data-view', 'threequarter');
    await expectWebGL(canvas);
    await page.screenshot({ path: 'test-results/spain-squad.png', fullPage: true });
  });

  test('390px phone gallery stays within the viewport and supports individual focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const canvas = await openSquad(page);
    const expectNoOverflow = async () => {
      expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= innerWidth))
        .toBe(true);
    };
    await expectNoOverflow();
    const status = page.locator('#squad-status');
    await page.locator('#showcase-focus').selectOption('A3');
    await expect(page.locator('#showcase-focus')).toHaveValue('A3');
    await expect(status).toHaveAttribute('data-focus', 'A3');
    await page.locator('button[data-view="back"]').click();
    await expect(status).toHaveAttribute('data-view', 'back');
    await expectWebGL(canvas);
    await expectNoOverflow();
    await page.screenshot({ path: 'test-results/spain-squad-mobile.png', fullPage: true });
  });

  test('game assigns the three Spain outfield characters and remains startable', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expectWebGL(page.locator('#pitch canvas'));
    const expectedCharacters: Record<string, string> = {
      'home-0': 'A1', 'home-1': 'A3', 'home-2': 'A2', 'home-3': '',
      'away-0': '', 'away-1': '', 'away-2': '', 'away-3': '',
    };
    const expectCharacters = async () => {
      await expect(page.locator('.role-marker[data-player]')).toHaveCount(8);
      for (const [player, identity] of Object.entries(expectedCharacters)) {
        const marker = page.locator(`.role-marker[data-player="${player}"]`);
        await expect(marker).toHaveCount(1);
        await expect(marker).toHaveAttribute('data-character', identity);
      }
    };
    await expectCharacters();
    await page.locator('#start').click();
    await expect(page.locator('#phase-label')).toHaveText('In play');
    await expect(page.locator('#pause')).toBeEnabled();
    // A ticking clock proves the real match loop advances, not only an overlay toggle.
    const initialClock = await page.locator('#clock').innerText();
    await expect(page.locator('#clock')).not.toHaveText(initialClock, { timeout: 5_000 });
    await expectCharacters();
    await page.locator('#pause').click();
    await expect(page.locator('#resume')).toBeVisible();
    await page.locator('#resume').click();
    await expect(page.locator('#phase-label')).toHaveText('In play');
  });
});
