import{test,expect}from'@playwright/test';
for(const viewport of[{width:1440,height:960},{width:390,height:844}]){
 test(`starting from the scrolled party setup brings the live pitch into view at ${viewport.width}px`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/');
  await page.locator('#start').scrollIntoViewIfNeeded();await page.locator('#start').click();
  await expect(page.locator('#pitch')).toHaveAttribute('data-phase',/^(entering|intro|playing)$/);
  await expect.poll(async()=>page.locator('#pitch canvas').evaluate(node=>{const box=node.getBoundingClientRect();return box.top>=0&&box.bottom<=innerHeight;}),{message:'The whole live canvas is visible after the long setup closes'}).toBe(true);
  await expect(page.locator('#pause')).toBeInViewport();
 });
}
