import {test,expect} from '@playwright/test';
test('confirmed Argentina models appear in an actual match and preserve native away controls',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.locator('#seat-p2-enabled').check();await page.locator('#seat-p2-device').selectOption('keyboard2');await page.locator('#start').click();await page.locator('#skip-intro').click();
 const chosen={'away-0':'P04','away-1':'P01','away-2':'P06','away-4':'P05','away-3':'K01'};
 for(const [id,candidate]of Object.entries(chosen))await expect(page.locator(`.role-marker[data-player="${id}"]`)).toHaveAttribute('data-character',candidate);
 await expect(page.locator('.role-marker[data-player="home-0"]')).toHaveAttribute('data-character','A1');
 await expect(page.locator('.role-marker[data-player="home-3"]')).toHaveAttribute('data-character','');
 const marker=page.locator('.role-marker[data-player="away-0"]');await expect(marker).toHaveAttribute('aria-label',/Argentina/);
 const before=await page.evaluate(()=>JSON.parse(document.querySelector<HTMLElement>('#pitch')!.dataset.playerPositions!)['away-0'].z as number);
 await page.keyboard.down('ArrowUp');
 try{await expect.poll(()=>page.evaluate(()=>JSON.parse(document.querySelector<HTMLElement>('#pitch')!.dataset.playerPositions!)['away-0'].z as number)).toBeLessThan(before-.25);}finally{await page.keyboard.up('ArrowUp');}
 for(const [id,candidate]of Object.entries(chosen))await expect(page.locator(`.role-marker[data-player="${id}"]`)).toHaveAttribute('data-character',candidate);
 await page.locator('#pause').click();await page.screenshot({path:test.info().outputPath('confirmed-argentina-in-match.png'),fullPage:true});
 expect(errors).toEqual([]);
});
