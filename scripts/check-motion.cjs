const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  let matches=0, nonmatches=0;
  for (const width of [320,375,390,430,1280]) {
   const mobile=width<768;
   const context=await browser.newContext({viewport:{width,height:mobile?568:900},isMobile:mobile,hasTouch:mobile,recordVideo:{dir:'/tmp/memory-cards-motion-videos'}});
   const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    let seed=42; Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
    window.motionFrames=[];
    function frame(){
     const row=document.querySelector('.card-row');
     const out=document.querySelector('[data-flight="outgoing"]');
     const inc=document.querySelector('[data-flight="incoming"]');
     if(out){const r=out.getBoundingClientRect();window.motionFrames.push({x:r.x,w:r.width,opacity:getComputedStyle(inc).opacity,paused:row.dataset.paused,text:out.textContent,overflow:document.documentElement.scrollWidth>innerWidth});}
     requestAnimationFrame(frame);
    }requestAnimationFrame(frame);
   });
   await page.goto(process.env.TEST_URL || 'https://memory-cards.maxflow.ink');
   await page.getByRole('button',{name:mobile?'Toca para comenzar':'Presiona ESPACIO para comenzar'}).click();
   const face=page.locator('.current-card .card-face');
   let previous=await face.evaluate(e=>[e.innerText,getComputedStyle(e.firstElementChild).color]);
   const gap=()=>page.waitForFunction(()=>document.querySelector('.card-row')?.dataset.phase==='gap');
   const answer=()=>page.waitForFunction(()=>document.querySelector('.card-row')?.dataset.phase==='answer');
   await gap(); await page.waitForTimeout(100);
   await page.getByRole('button',{name:'Pausar',exact:true}).evaluate(e=>e.click());
   await page.waitForTimeout(60);
   const state=()=>page.evaluate(()=>{const e=document.querySelector('[data-flight="outgoing"]');return {x:e.getBoundingClientRect().x,time:e.getAnimations()[0].currentTime}});
   const frozen=await state(); await page.waitForTimeout(600); const later=await state();
   assert.ok(Math.abs(frozen.x-later.x)<.1);assert.ok(Math.abs(frozen.time-later.time)<1);
   await page.screenshot({path:`/tmp/memory-cards-motion-paused-${width}.png`});
   await page.getByRole('button',{name:'Reanudar',exact:true}).evaluate(e=>e.click());await answer();
   for(let turn=0;turn<4;turn++){
    const current=await face.evaluate(e=>[e.innerText,getComputedStyle(e.firstElementChild).color]);
    const match=current[0]===previous[0]&&current[1]===previous[1];if(match)matches++;else nonmatches++;
    const id=await page.locator('.current-card').getAttribute('data-card-id');
    await page.locator('.answer-button').click();
    const feedback=await page.locator('.card-feedback').innerText();
    assert.ok(feedback.includes(match?'+100':'-50'));
    await gap();await answer();
    assert.notEqual(await page.locator('.current-card').getAttribute('data-card-id'),id);
    previous=current;
   }
   // A selector opened mid-flight must restore the frozen progress on cancellation.
   await page.locator('.answer-button').click();await gap();await page.waitForTimeout(80);
   await page.getByLabel('Elegir nivel').selectOption('2');
   await page.getByRole('button',{name:'Cancelar',exact:true}).click();await answer();
   await page.getByLabel('Elegir nivel').selectOption('2');
   await page.getByRole('button',{name:'Cambiar nivel',exact:true}).click();
   await page.getByText('1/20',{exact:true}).first().waitFor();
   const frames=await page.evaluate(()=>window.motionFrames);
   assert.ok(frames.length>20);assert.ok(frames.every(f=>!f.overflow&&f.text==='🂠'));
   assert.ok(new Set(frames.map(f=>Math.round(f.x))).size>6,'visible horizontal trajectory');
   assert.ok(new Set(frames.map(f=>Math.round(f.w))).size>6,'card shrinks toward previous slot');
   assert.ok(frames.some(f=>+f.opacity>.1&&+f.opacity<.9),'incoming card fades in');
   assert.deepEqual(errors,[]);
   console.log(`${width}: ${frames.length} actual animation frames; trajectory, scaling, entry, pause/resume, consecutive turns and level change OK`);
   await context.close();
  }
  assert.ok(matches>0&&nonmatches>0);console.log({matches,nonmatches});
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
