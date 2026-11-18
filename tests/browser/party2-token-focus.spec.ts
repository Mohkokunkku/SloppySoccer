import {test,expect} from '@playwright/test';
test('device-token keyboard focus survives changing teams and periodic device refresh',async({page})=>{
 await page.goto('/');const token=page.locator('#seat-p1-token');await token.focus();await page.keyboard.press('Enter');
 await expect(page.locator('#seat-p1-team')).toHaveValue('away');await expect(token).toBeFocused();
 await page.waitForTimeout(1300);await expect(token).toBeFocused();await page.keyboard.press('Space');
 await expect(page.locator('#seat-p1-team')).toHaveValue('home');await expect(token).toBeFocused();
});
