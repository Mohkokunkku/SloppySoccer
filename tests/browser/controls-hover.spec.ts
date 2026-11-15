import {test,expect} from '@playwright/test';
import {startPartyMatch} from './party-helpers';
test('toolbar icons show hoverable top-layer bindings without stealing pitch focus; Escape only dismisses help',async({page})=>{
 await page.goto('/');const keys=page.getByRole('button',{name:'Keyboard controls',exact:true}),pad=page.getByRole('button',{name:'Gamepad controls',exact:true}),popup=page.locator('#control-help-popover');
 await keys.hover();await expect(popup).toBeVisible();await expect(popup.locator('img:visible')).toHaveCount(2);
 await expect(keys).toHaveCSS('background-color','rgb(23, 53, 73)');await expect(keys).toHaveCSS('font-size','24px');
 expect(await popup.evaluate(e=>e.matches(':popover-open'))).toBe(true);
 const rect=await popup.boundingBox();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.y).toBeGreaterThanOrEqual(0);
 await popup.hover();await page.waitForTimeout(250);await expect(popup).toBeVisible();
 await pad.hover();await expect(popup.locator('img:visible')).toHaveCount(1);await expect(popup.locator('img:visible')).toHaveAttribute('src','/controls/gamepad.svg');
 await page.mouse.move(5,5);await expect(popup).toBeHidden();
 await startPartyMatch(page);const canvas=page.locator('#pitch canvas');await expect(canvas).toBeFocused();
 await keys.hover();await expect(canvas).toBeFocused();await expect(popup).toBeVisible();await page.keyboard.press('Escape');await expect(popup).toBeHidden();await expect(page.locator('#phase-label')).toHaveText('In play');
 await keys.focus();await expect(popup).toBeVisible();await page.keyboard.press('Escape');await expect(keys).toBeFocused();await expect(popup).toBeHidden();
 await page.screenshot({path:test.info().outputPath('control-icons-desktop.png'),fullPage:true});
});
test.describe('phone help',()=>{
 test.use({hasTouch:true,viewport:{width:390,height:844}});
 test('tap pins and dismisses keyboard/gamepad diagrams within the phone viewport',async({page})=>{
  await page.goto('/');const popup=page.locator('#control-help-popover');await page.getByRole('button',{name:'Keyboard controls',exact:true}).tap();await expect(popup).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const r=await popup.boundingBox();expect(r!.x).toBeGreaterThanOrEqual(0);expect(r!.x+r!.width).toBeLessThanOrEqual(390);expect(r!.y+r!.height).toBeLessThanOrEqual(844);
  await page.screenshot({path:test.info().outputPath('keyboard-help-phone.png'),fullPage:true});await popup.getByRole('button',{name:'Close controls'}).tap();await expect(popup).toBeHidden();
  await page.getByRole('button',{name:'Gamepad controls',exact:true}).tap();await expect(popup.locator('img:visible')).toHaveCount(1);await page.screenshot({path:test.info().outputPath('gamepad-help-phone.png'),fullPage:true});
 });
});
