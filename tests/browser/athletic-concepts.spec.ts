import {test,expect} from '@playwright/test';

test('two sporty classic-A variants render and can be compared under production CSP',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto('/athletic-concepts.html');expect(response?.status()).toBe(200);
  await expect(page.locator('.variant')).toHaveCount(2);
  await expect(page.getByRole('heading',{name:/Matchday Athlete/})).toBeVisible();
  await expect(page.getByRole('heading',{name:/Power Captain/})).toBeVisible();
  await expect(page.locator('#selection')).toContainText('No variant selected');
  for(const choice of ['A1','A2']){
    await page.locator(`button[data-option="${choice}"]`).click();
    await expect(page.locator('#selection')).toContainText(choice);
    await expect(page.locator(`button[data-option="${choice}"]`)).toHaveAttribute('aria-pressed','true');
  }
  expect(await page.locator('svg').count()).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(()=>[...document.querySelectorAll('use')].every(use=>{const href=use.getAttribute('href');return !!href&&href.startsWith('#')&&!!document.getElementById(href.slice(1));}))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.reload();await expect(page.locator('#selection')).toContainText('No variant selected');
  await page.screenshot({path:'test-results/athletic-concepts.png',fullPage:true});
  expect(errors).toEqual([]);
});

test('sporty variants remain readable on a phone',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/athletic-concepts.html');
  await expect(page.locator('.variant')).toHaveCount(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/athletic-concepts-mobile.png',fullPage:true});
});
