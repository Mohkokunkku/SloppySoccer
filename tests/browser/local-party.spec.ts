import { test as base, expect, type Page } from '@playwright/test';

// Production Fastify/compiled assets from playwright.config.ts; no state injection,
// routes, clock substitution, controller mocks, or replacement WebGL contexts.
const test = base.extend<{ runtimeChecks: void }>({
  runtimeChecks: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await use();
    expect(errors, 'Production runtime errors').toEqual([]);
  }, { auto: true }],
});

type Positions = Record<string, { x: number; z: number }>;
async function jsonAttribute<T>(page: Page, selector: string, name: string): Promise<T> {
  const value = await page.locator(selector).getAttribute(name);
  expect(value, `${selector} ${name} must be published by the real renderer`).not.toBeNull();
  return JSON.parse(value!) as T;
}
const bindings = (page: Page) => jsonAttribute<Record<string, string>>(page, '#pitch', 'data-controlled-players');
const positions = (page: Page, selector = '#pitch') => jsonAttribute<Positions>(page, selector, 'data-player-positions');

async function open(page: Page): Promise<void> {
  expect((await page.goto('/'))?.status()).toBe(200);
  await expect(page.locator('#pitch')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('#pitch canvas')).toBeVisible();
  expect(await page.locator('#pitch canvas').evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!gl && !gl.isContextLost() && gl.drawingBufferWidth > 0;
  })).toBe(true);
}
async function configurePair(page: Page, team: 'home' | 'away'): Promise<void> {
  await page.locator('#seat-p2-enabled').check();
  await page.locator('#seat-p2-team').selectOption(team);
  await page.locator('#seat-p2-device').selectOption('keyboard2');
}
async function spotlight(page: Page): Promise<void> {
  await page.locator('#start').click();
  await expect(page.locator('#phase-label')).toHaveText('Teams entering');
  await expect(page.locator('#phase-label')).toHaveText('Team spotlight', { timeout: 30_000 });
  await expect(page.locator('#pitch')).toHaveAttribute('data-phase', 'intro');
}
async function start(page: Page): Promise<void> {
  await spotlight(page);
  await page.locator('#skip-intro').click();
  await expect(page.locator('#phase-label')).toHaveText('In play');
  await expect(page.locator('#pitch')).toHaveAttribute('data-camera-mode', 'wide');
}
function expectPair(map: Record<string, string>, team: 'home' | 'away'): void {
  expect(Object.keys(map).sort()).toEqual(['p1', 'p2']);
  expect(map.p1).toMatch(/^home-[0124]$/);
  expect(map.p2).toMatch(new RegExp(`^${team}-[0124]$`));
  expect(new Set(Object.values(map)).size).toBe(2);
}

for (const formation of ['2-1-1', '1-2-1']) {
  test(`ten figures and per-team role counts follow ${formation}`, async ({ page }) => {
    await open(page);
    for (const team of ['home', 'away']) await page.locator(`#formation-${team}`).selectOption(formation);
    await expect(page.locator('.role-marker[data-player]')).toHaveCount(10);
    for (const team of ['home', 'away']) {
      await expect(page.locator(`#formation-${team}`)).toHaveValue(formation);
      const markers = page.locator(`.role-marker[data-player^="${team}-"]`);
      await expect(markers).toHaveCount(5);
      await expect(markers.filter({ hasText: /^GK$/ })).toHaveCount(1);
      await expect(page.locator(`.role-marker[data-player="${team}-3"]`)).toHaveText('GK');
      await expect(page.locator(`.role-marker[data-player="${team}-4"]`)).not.toHaveText('GK');
      await expect(markers.filter({ hasText: /^A$/ })).toHaveCount(1);
      await expect(markers.filter({ hasText: /^M$/ })).toHaveCount(formation === '1-2-1' ? 2 : 1);
      await expect(markers.filter({ hasText: /^D$/ })).toHaveCount(formation === '2-1-1' ? 2 : 1);
    }
    await start(page);
    for (const team of ['home', 'away']) await expect(page.locator(`#formation-${team}`)).toBeDisabled();
  });
}

for (const team of ['home', 'away'] as const) {
  test(`${team === 'home' ? 'co-op' : 'opposing'} keyboards move independently and preserve exclusive bindings`, async ({ page }) => {
    await open(page);
    await configurePair(page, team);
    await start(page);
    const initial = await bindings(page);
    expectPair(initial, team);
    const before = await positions(page);
    await page.keyboard.down('KeyW');
    await page.keyboard.down('ArrowDown');
    try {
      await expect.poll(async () => {
        const current = await positions(page);
        return current[initial.p1].z < before[initial.p1].z - 0.3
          && current[initial.p2].z > before[initial.p2].z + 0.3;
      }, { timeout: 3000, message: 'Both assigned figures move in opposite real-key directions together' }).toBe(true);
    } finally {
      await page.keyboard.up('KeyW');
      await page.keyboard.up('ArrowDown');
    }
    expect(await bindings(page)).toEqual(initial);
    await page.keyboard.down('KeyQ');
    await page.keyboard.down('Period');
    await page.keyboard.up('KeyQ');
    await page.keyboard.up('Period');
    await expect.poll(async () => {
      const current = await bindings(page);
      return current.p1 !== initial.p1 && current.p2 !== initial.p2;
    }).toBe(true);
    const switched = await bindings(page);
    expectPair(switched, team);
    // Pass pulses may auto-select an unclaimed AI receiver, but never the
    // other human's player. Keep the second seat idle to test its binding.
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(300);
    const afterPass = await bindings(page);
    expectPair(afterPass, team);
    expect(afterPass.p2).toBe(switched.p2);
    await page.keyboard.press('Slash');
    await page.waitForTimeout(300);
    const afterOtherPass = await bindings(page);
    expectPair(afterOtherPass, team);
    expect(afterOtherPass.p1).toBe(afterPass.p1);
  });
}

test('natural spotlight freezes clock, shows close-up then pulls back to live play', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page);
  const clock = await page.locator('#clock').innerText();
  await expect(page.locator('#skip-intro')).not.toBeVisible();
  await spotlight(page);
  await expect(page.locator('#skip-intro')).toBeVisible();
  await expect(page.locator('#pitch')).toHaveAttribute('data-camera-mode', 'intro');
  await expect(page.locator('#pitch')).toHaveAttribute('data-intro-shot', /\S+/);
  await expect(page.locator('#clock')).toHaveText(clock);
  await page.waitForTimeout(500);
  await expect(page.locator('#clock')).toHaveText(clock);
  await expect(page.locator('#pitch')).toHaveAttribute('data-camera-mode', 'intro-pullback', { timeout: 8000 });
  await expect(page.locator('#phase-label')).toHaveText('In play');
  await expect(page.locator('#pitch')).toHaveAttribute('data-camera-mode', 'wide');
  await expect(page.locator('#skip-intro')).not.toBeVisible();
  await expect(page.locator('#clock')).not.toHaveText(clock, { timeout: 5000 });
});

test('skip and change players restore editable four-seat setup; reduced motion stays wide', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  for (let seat = 1; seat <= 4; seat++) {
    await expect(page.locator(`#seat-p${seat}-enabled`)).toBeChecked({ checked: seat === 1 });
    await expect(page.locator(`#seat-p${seat}-team`)).toHaveCount(1);
    await expect(page.locator(`#seat-p${seat}-device`)).toHaveCount(1);
  }
  await configurePair(page, 'away');
  await spotlight(page);
  await expect(page.locator('#pitch')).toHaveAttribute('data-camera-mode', 'wide');
  for (const selector of ['#seat-p2-enabled', '#seat-p1-team', '#seat-p1-device']) {
    await expect(page.locator(selector)).toBeDisabled();
  }
  await page.locator('#skip-intro').click();
  await expect(page.locator('#phase-label')).toHaveText('In play');
  await expect(page.locator('#local-input-status')).toHaveAttribute('role', 'status');
  await page.locator('#change-players').click();
  await expect(page.locator('#pitch')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('#pitch')).toHaveAttribute('data-camera-mode', 'wide');
  await expect(page.locator('#seat-p2-enabled')).toBeEnabled();
  await expect(page.locator('#formation-home')).toBeEnabled();
});

test('all five demo dances visibly travel in the rendered plane', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect((await page.goto('/celebrations.html'))?.status()).toBe(200);
  await expect(page.locator('#demo-pitch canvas')).toBeVisible();
  await expect(page.locator('button[data-dance]')).toHaveCount(5);
  for (const [index, name] of ['Boot bounce', 'Windmill wave', 'Toy shuffle', 'Victory orbit', 'Heel-toe slide'].entries()) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('#demo-status')).toHaveAttribute('data-phase', 'goal');
    await expect(page.locator('#demo-status')).toContainText(name);
    await expect(page.locator('#demo-pitch')).toHaveAttribute('data-dance-style', String(index));
    const before = await positions(page, '#demo-pitch');
    expect(Object.keys(before)).toHaveLength(10);
    await expect.poll(async () => {
      const current = await positions(page, '#demo-pitch');
      return Object.keys(before).some(id => id.startsWith('home-')
        && Math.hypot(current[id].x - before[id].x, current[id].z - before[id].z) > 0.08);
    }, { timeout: 2500, message: `${name} translates a real figure root, not just its limbs` }).toBe(true);
    await expect(page.locator('#demo-status')).toHaveAttribute('data-phase', 'goal');
  }
});

test('390px local setup and active match have no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const noOverflow = async () => expect(await page.evaluate(() =>
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= innerWidth)).toBe(true);
  await noOverflow();
  for (let seat = 1; seat <= 4; seat++) {
    await page.locator(`#seat-p${seat}-device`).scrollIntoViewIfNeeded();
    await expect(page.locator(`#seat-p${seat}-device`)).toBeInViewport();
  }
  await configurePair(page, 'away');
  await start(page);
  await noOverflow();
  await page.locator('#change-players').click();
  await expect(page.locator('#pitch')).toHaveAttribute('data-phase', 'ready');
  await noOverflow();
});
