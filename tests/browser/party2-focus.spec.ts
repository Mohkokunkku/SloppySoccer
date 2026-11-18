import {test,expect} from '@playwright/test';
import {startPartyMatch} from './party-helpers';
test('leaving a keyboard-operated touch shot button cancels rather than releases a kick',async({page})=>{
 test.setTimeout(45000);await page.goto('/');await page.locator('#seat-p2-enabled').check();await page.locator('#seat-p2-device').selectOption('keyboard2');await page.locator('#touch-toggle').click();
 await startPartyMatch(page);await page.keyboard.down('KeyA');await page.locator('button[data-code="Space"]').focus();await page.keyboard.down('Space');
 await expect(page.locator('.kick-meter[data-seat="p1"]')).toHaveAttribute('data-charging','true');
 await page.keyboard.press('Tab');await page.keyboard.up('Space');await page.keyboard.up('KeyA');
 await expect(page.locator('.kick-meter[data-seat="p1"]')).toHaveAttribute('data-charging','false');
 await expect(page.locator('#pitch')).toHaveAttribute('data-ball-release','null');
});
