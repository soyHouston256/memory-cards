const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  for (const mobile of [true,false]) {
   const page = await browser.newPage({viewport: mobile ? {width:320,height:568} : {width:1280,height:900},isMobile:mobile,hasTouch:mobile});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(process.env.TEST_URL || 'https://memory-cards.maxflow.ink');
   await page.getByRole('button',{name:mobile?'Toca para comenzar':'Presiona ESPACIO para comenzar'}).click();
   await page.getByRole('button',{name:'Pausar',exact:true}).click();
   await page.waitForTimeout(100);
   const frozen = await page.locator('.game-stats').innerText();
   const countdown = await page.locator('.card-countdown').innerText();
   await page.waitForTimeout(3200);
   assert.equal(await page.locator('.game-stats').innerText(),frozen);
   assert.equal(await page.locator('.card-countdown').innerText(),countdown);
   await page.getByRole('button',{name:'Reanudar',exact:true}).click();
   const answer=page.locator('.answer-button'); await answer.waitFor();
   await page.getByRole('button',{name:'Pausar',exact:true}).click();
   assert.ok(await answer.isDisabled());
   const stats=await page.locator('.game-stats').innerText();
   await page.locator('body').click({position:{x:2,y:2}});
   await page.keyboard.press('Enter');await page.waitForTimeout(3200);
   assert.equal(await page.locator('.game-stats').innerText(),stats);
   await page.getByLabel('Elegir nivel').selectOption('3');
   await page.getByRole('button',{name:'Cancelar',exact:true}).click();
   await page.getByRole('button',{name:'Reanudar',exact:true}).waitFor();
   await page.getByLabel('Elegir nivel').selectOption('3');
   await page.getByRole('button',{name:'Cambiar nivel',exact:true}).click();
   await page.getByText('1/25',{exact:true}).first().waitFor();
   await page.getByRole('button',{name:'Pausar',exact:true}).waitFor();
   await page.getByLabel('Elegir nivel').selectOption('1');
   await page.getByRole('button',{name:'Cambiar nivel',exact:true}).click();
   // Complete an actual level with natural timers and wait for explicit rest.
   await page.getByRole('button',{name:'Siguiente nivel',exact:true}).waitFor({timeout:65000});
   await page.waitForTimeout(3500);
   await page.getByRole('heading',{name:'¡Nivel 1 completado!'}).waitFor();
   await page.screenshot({path:`/tmp/memory-cards-rest-${mobile?'mobile':'desktop'}.png`});
   await page.getByRole('button',{name:'Siguiente nivel',exact:true}).click();
   await page.getByText('1/20',{exact:true}).first().waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.deepEqual(errors,[]);
   console.log(`${mobile?'mobile':'desktop'}: pause freezes clock/score, keyboard blocked, cancel restores pause, level selection resets, rest waits and next level starts OK`);
   await page.close();
  }
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
