import {test,expect} from '@playwright/test';
import {startPartyMatch} from './party-helpers';
test('mouse sound toggles keep the pitch focused and shooting immediately available',async({page})=>{
 await page.goto('/');await page.locator('#seat-p2-enabled').check();await page.locator('#seat-p2-device').selectOption('keyboard2');await startPartyMatch(page);
 await page.keyboard.down('KeyA');const canvas=page.locator('#pitch canvas');
 await page.locator('#sound-toggle').click();await expect(canvas).toBeFocused();await page.keyboard.down('Space');
 await expect(page.locator('.kick-meter[data-seat="p1"]')).toHaveAttribute('data-charging','true');
 await page.locator('#sound-toggle').click();await expect(canvas).toBeFocused();await expect(page.locator('#sound-toggle')).toHaveAttribute('aria-pressed','false');
 await page.keyboard.up('Space');await page.keyboard.up('KeyA');
});
