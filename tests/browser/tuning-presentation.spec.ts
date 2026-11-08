import { test as base, expect, type Page } from '@playwright/test';
import { DEFAULT_TUNING, TUNING_LIMITS } from '../../shared/tuning';
import { waitForPartyPlay } from './party-helpers';

// Real production server from playwright.config.ts. No routes, engine mutations,
// synthetic goals, fake timers, or replacement audio/WebGL implementations.
const test = base.extend<{ runtimeChecks: void }>({
  runtimeChecks: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await use();
    expect(errors, 'Production console and uncaught errors').toEqual([]);
  }, { auto: true }],
});

const keys = Object.keys(TUNING_LIMITS) as (keyof typeof TUNING_LIMITS)[];
const geometry = ['fieldWidth', 'fieldHeight', 'goalWidth', 'goalHeight'] as const;
const diagnostic = { fieldWidth: 'data-field-width', fieldHeight: 'data-field-height', goalWidth: 'data-goal-width', goalHeight: 'data-goal-height' };

async function open(page: Page): Promise<void> {
  expect((await page.goto('/'))?.status()).toBe(200);
  await expect(page.locator('#pitch canvas')).toBeVisible();
  await expect(page.locator('#pitch')).toHaveAttribute('data-phase', 'ready');
  await page.locator('#tuning-panel summary').click();
  await expect(page.locator('#tuning-panel summary')).toHaveText('Tuning lab');
}

async function start(page: Page): Promise<void> {
  await page.locator('#start').click();
  await expect(page.locator('#pitch')).toHaveAttribute('data-phase', 'entering');
  await expect(page.locator('#phase-label')).toHaveText('Teams entering');
}

async function playing(page: Page): Promise<void> {
  await waitForPartyPlay(page);
}

async function snapshot(page: Page) {
  return page.locator('#pitch').evaluate(node => ({
    clock: document.querySelector('#clock')?.textContent,
    home: document.querySelector('#home-score')?.textContent,
    away: document.querySelector('#away-score')?.textContent,
    ball: node.getAttribute('data-ball-position'),
    rotation: node.getAttribute('data-ball-rotation'),
    run: node.getAttribute('data-run-phase'),
    entry: node.getAttribute('data-entry-count'),
  }));
}

test('all eleven live sliders are labelled, keyboard operable and resettable', async ({ page }) => {
  await open(page);
  await expect(page.locator('#tuning-panel input[type=range]')).toHaveCount(keys.length);
  await expect(page.locator('#tuning-status')).toHaveAttribute('role', 'status');
  for (const key of keys) {
    const slider = page.locator(`#tune-${key}`);
    const rule = TUNING_LIMITS[key];
    await expect(slider).toHaveAccessibleName(rule.label);
    await expect(slider).toHaveAttribute('min', String(rule.min));
    await expect(slider).toHaveAttribute('max', String(rule.max));
    await expect(slider).toHaveAttribute('step', String(rule.step));
    // Native ranges snap non-step-aligned defaults (notably sprint multiplier).
    const initialValue = Number(await slider.inputValue());
    expect(Math.abs(initialValue - DEFAULT_TUNING[key])).toBeLessThanOrEqual(rule.step / 2 + 0.000001);
    const output = page.locator(`output[for="tune-${key}"]`);
    await expect(output).toBeVisible();
    const before = await output.innerText();
    await slider.focus();
    await slider.press('ArrowRight');
    expect(Number(await slider.inputValue())).toBeCloseTo(initialValue + rule.step, 6);
    await expect(output).not.toHaveText(before);
    await expect(page.locator('#phase-label')).toHaveText('Kick-off');
  }
  await expect(page.locator('#tuning-status')).not.toBeEmpty();
  await page.getByRole('button', { name: 'Reset tuning', exact: true }).click();
  for (const key of keys) {
    const value = Number(await page.locator(`#tune-${key}`).inputValue());
    expect(Math.abs(value - DEFAULT_TUNING[key])).toBeLessThanOrEqual(TUNING_LIMITS[key].step / 2 + 0.000001);
  }
  for (const key of geometry) await expect(page.locator('#pitch')).toHaveAttribute(diagnostic[key], String(DEFAULT_TUNING[key]));
});

test('entrance freezes the clock, pauses all motion, and resumes into a ticking match', async ({ page }) => {
  await open(page);
  const initialClock = await page.locator('#clock').innerText();
  // Pause through the real UI in the same task, before a short entrance can finish
  // between separate automation round trips on a loaded software-rendering host.
  await page.evaluate(()=>{
    document.querySelector<HTMLButtonElement>('#start')!.click();
    document.querySelector<HTMLButtonElement>('#pause')!.click();
  });
  await expect(page.locator('#pitch')).toHaveAttribute('data-phase','entering');
  await expect(page.locator('#pitch')).toHaveAttribute('data-entry-count', /^(?:[1-9]|10)$/);
  await expect(page.locator('#clock')).toHaveText(initialClock);
  await expect(page.locator('#phase-label')).toHaveText('Paused');
  // Let the frame that presents the pause settle before comparing actual state.
  await page.waitForTimeout(100);
  const paused = await snapshot(page);
  for (const key of ['ball', 'rotation', 'run', 'entry'] as const) expect(paused[key], key).not.toBeNull();
  await page.waitForTimeout(1200);
  expect(await snapshot(page)).toEqual(paused);
  await page.locator('#resume').click();
  await playing(page);
  await expect(page.locator('#pitch')).toHaveAttribute('data-entry-count', '0');
  await expect(page.locator('#clock')).not.toHaveText(initialClock, { timeout: 5000 });
  await expect(page.locator('.role-marker[data-player]')).toHaveCount(10);
});

test('live geometry preserves an existing match and rebuilds only geometry', async ({ page }) => {
  await open(page);
  await start(page);
  await playing(page);
  await expect(page.locator('#clock')).not.toHaveText('2:00', { timeout: 5000 });
  await page.locator('#pause').click();
  await page.waitForTimeout(100);
  const before = await snapshot(page);
  const pitch = page.locator('#pitch');
  await expect(pitch).toHaveAttribute('data-board-rebuilds', /^\d+$/);
  const rebuilds = Number(await pitch.getAttribute('data-board-rebuilds'));
  await page.locator('#tune-runSpeed').press('ArrowRight');
  await page.waitForTimeout(150);
  expect(Number(await pitch.getAttribute('data-board-rebuilds'))).toBe(rebuilds);
  for (const key of geometry) {
    await page.locator(`#tune-${key}`).press('End');
    await expect(pitch).toHaveAttribute(diagnostic[key], String(TUNING_LIMITS[key].max));
    const current = await snapshot(page);
    expect([current.clock, current.home, current.away]).toEqual([before.clock, before.home, before.away]);
    await expect(page.locator('#phase-label')).toHaveText('Paused');
    await expect(page.locator('.role-marker[data-player]')).toHaveCount(10);
    await expect(page.locator('#pitch canvas')).toHaveCount(1);
  }
  expect(Number(await pitch.getAttribute('data-board-rebuilds'))).toBeGreaterThan(rebuilds);
  await page.locator('#tuning-reset').click();
  for (const key of geometry) await expect(pitch).toHaveAttribute(diagnostic[key], String(DEFAULT_TUNING[key]));
  const reset = await snapshot(page);
  expect([reset.clock, reset.home, reset.away]).toEqual([before.clock, before.home, before.away]);
  await page.locator('#resume').click();
  await expect(page.locator('#phase-label')).toHaveText('In play');
  await expect(page.locator('#clock')).not.toHaveText(before.clock ?? '', { timeout: 5000 });
});

test('a moving ball has no displacement or spin while paused', async ({ page }) => {
  await open(page);
  await start(page);
  await playing(page);
  const pitch = page.locator('#pitch');
  const initial = await pitch.getAttribute('data-ball-position');
  expect(initial).not.toBeNull();
  await page.keyboard.press('Space');
  await expect(pitch).not.toHaveAttribute('data-ball-position', initial!, { timeout: 8000 });
  await page.locator('#pause').click();
  await page.waitForTimeout(100);
  const paused = await snapshot(page);
  expect(paused.rotation).not.toBeNull();
  await page.waitForTimeout(1200);
  expect(await snapshot(page)).toEqual(paused);
});

for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
  test(`expanded tuning panel remains readable without overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);
    for (const key of geometry) await page.locator(`#tune-${key}`).press('End');
    for (const key of keys) {
      const slider = page.locator(`#tune-${key}`);
      await slider.scrollIntoViewIfNeeded();
      await expect(slider).toBeInViewport();
      const box = await slider.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(100);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
      const output = page.locator(`output[for="tune-${key}"]`);
      await expect(output).toBeVisible();
      expect(await output.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(12);
    }
    expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`tuning-${viewport.width}.png`), fullPage: true });
  });
}

test('live controls also apply without pausing or restarting play',async({page})=>{
  await open(page);await start(page);await playing(page);
  await expect(page.locator('#clock')).not.toHaveText('2:00');
  const before=await page.locator('#clock').innerText();
  await page.locator('#tune-runSpeed').press('End');await page.locator('#tune-fieldWidth').press('End');
  await expect(page.locator('#pitch')).toHaveAttribute('data-field-width','48');
  await expect(page.locator('#pitch')).toHaveAttribute('data-phase',/^(playing|goal|resetting)$/);
  await expect(page.locator('#phase-label')).not.toHaveText('Paused');
  const after=await page.locator('#clock').innerText();
  const seconds=(value:string)=>value.split(':').reduce((sum,n)=>sum*60+Number(n),0);
  expect(seconds(after)).toBeLessThanOrEqual(seconds(before));
});

test('goal and crowd audition use native playback and fully stop on mute without changing the score',async({page})=>{
  await open(page);const sound=page.locator('#sound-toggle');
  await page.locator('#sound-goal').click();
  await expect.poll(async()=>Number(await sound.getAttribute('data-played'))).toBeGreaterThanOrEqual(2);
  await expect.poll(async()=>Number(await sound.getAttribute('data-active'))).toBeGreaterThan(0);
  await sound.click();await expect(sound).toHaveAttribute('data-active','0');await expect(sound).toHaveAttribute('data-pending','0');
  const count=Number(await sound.getAttribute('data-played'));
  await page.locator('#sound-crowd').click();
  await expect.poll(async()=>Number(await sound.getAttribute('data-played'))).toBeGreaterThan(count);
  await sound.click();await expect(sound).toHaveAttribute('data-active','0');
  await expect(page.locator('#home-score')).toHaveText('0');await expect(page.locator('#away-score')).toHaveText('0');await expect(page.locator('#phase-label')).toHaveText('Kick-off');
});

test('production samples decode and optional playback cancels across mute and pause', async ({ page, request }) => {
  test.setTimeout(60_000);
  await open(page);
  const clips = ['kick', 'voice-go', 'voice-yes', 'crowd-shot', 'crowd-goal', 'goal-music'];
  for (const clip of clips) {
    const response = await request.get(`/audio-v2/${clip}.wav`);
    expect(response.status(), clip).toBe(200);
    expect((await response.body()).length, clip).toBeGreaterThan(1000);
  }
  // Decode actual deployed bytes with the browser's native decoder, not a mock.
  const decoded = await page.evaluate(async names => {
    const context = new AudioContext();
    try {
      return await Promise.all(names.map(async name => {
        const response = await fetch(`/audio-v2/${name}.wav`);
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        return { name, duration: buffer.duration, channels: buffer.numberOfChannels };
      }));
    } finally { await context.close(); }
  }, clips);
  for (const clip of decoded) { expect(clip.duration, clip.name).toBeGreaterThan(0); expect(clip.channels).toBeGreaterThan(0); }
  const music = decoded.find(clip => clip.name === 'goal-music')!;
  expect(music.duration).toBeGreaterThanOrEqual(3);
  expect(music.duration).toBeLessThanOrEqual(5);
  const sound = page.locator('#sound-toggle');
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#sound-test').click();
  await expect.poll(async () => Number(await sound.getAttribute('data-played'))).toBeGreaterThan(0);
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  const mutedCount = await sound.getAttribute('data-played');
  await page.waitForTimeout(1500);
  await expect(sound).toHaveAttribute('data-played', mutedCount!);
  // Trigger a real demo then mute in the same task: pending decode/unlock work
  // must not increment playback later. Native DOM clicks use production handlers.
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('#sound-test')!.click();
    document.querySelector<HTMLButtonElement>('#sound-toggle')!.click();
  });
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  const cancelledCount = await sound.getAttribute('data-played');
  await page.waitForTimeout(1500);
  await expect(sound).toHaveAttribute('data-played', cancelledCount!);
  await start(page);
  await page.locator('#sound-test').click();
  await page.locator('#pause').click();
  await expect(page.locator('#phase-label')).toHaveText('Paused');
  const pausedCount = await sound.getAttribute('data-played');
  await page.waitForTimeout(1500);
  await expect(sound).toHaveAttribute('data-played', pausedCount!);
  await expect(page.locator('#audio-status')).toBeEmpty();
});
