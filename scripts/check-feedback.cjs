const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
 let engines=[['chromium',chromium]];
 try {const probe=await webkit.launch({headless:true});await probe.close();engines.push(['webkit',webkit]);}
 catch {console.log('WebKit unavailable locally; Safari/iPhone is NOT verified.');}
 for(const [engineName,engine] of engines){
 const browser=await engine.launch({headless:true,...(engineName==='chromium'?{args:['--no-sandbox']}: {})});
 try{
  for(const width of [320,375,390,430,1280]){
   const mobile=width<768;
   const context=await browser.newContext({viewport:{width,height:mobile?664:900},isMobile:mobile,hasTouch:mobile,recordVideo:{dir:'/tmp/memory-feedback-after'}});
   const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{let seed=42;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};window.responseFrames=[];function frame(){const row=document.querySelector('.card-row');const face=document.querySelector('.card-face');const prev=document.querySelector('.previous-card .card-back');const flight=document.querySelector('[data-flight="outgoing"]');if(row&&face){const r=face.getBoundingClientRect();window.responseFrames.push({phase:row.dataset.phase,visibility:getComputedStyle(face).visibility,feedback:!!document.querySelector('.card-feedback'),flights:document.querySelectorAll('[data-flight]').length,previousOpacity:prev?+getComputedStyle(prev).opacity:0,time:flight?.getAnimations()[0]?.currentTime,rect:[r.x,r.y,r.width,r.height],overflow:document.documentElement.scrollWidth>innerWidth});}requestAnimationFrame(frame)}requestAnimationFrame(frame)});
   await page.goto(process.env.TEST_URL||'https://memory-cards.maxflow.ink');
   await page.getByRole('button',{name:mobile?'Toca para comenzar':'Presiona ESPACIO para comenzar'}).click();
   const face=page.locator('.card-face');
   const signature=()=>face.evaluate(e=>[e.innerText,getComputedStyle(e.firstElementChild).color].join('|'));
   let previous=await signature();
   const waitPhase=phase=>page.waitForFunction(value=>document.querySelector('.card-row')?.dataset.phase===value,phase);
   await waitPhase('answer');
   const score=async()=>Number(await page.locator('.game-stats .text-purple-600').innerText());
   for(const action of ['tap','repeated','timeout','pause-feedback']){
    const current=await signature(),matched=current===previous, before=await score();
    const oldId=await page.locator('.current-card').getAttribute('data-card-id');
    if(action==='timeout') await waitPhase('feedback');
    else await page.locator('.answer-button').evaluate((e,repeated)=>{e.click();if(repeated){e.click();e.click();}},action==='repeated');
    await waitPhase('feedback');
    const expected=Math.max(0,before+((matched===(action!=='timeout'))?100:-50));
    assert.equal(await score(),expected,`score once: ${action}`);
    if(action==='pause-feedback'){
     await page.getByRole('button',{name:'Pausar',exact:true}).evaluate(e=>e.click());
     const feedback=await page.locator('.card-feedback').innerText();
     await page.waitForTimeout(500);
     assert.equal(await page.locator('.card-feedback').innerText(),feedback);
     assert.equal(await score(),expected);
     await page.screenshot({path:`/tmp/feedback-fixed-${width}.png`});
     await page.getByRole('button',{name:'Reanudar',exact:true}).evaluate(e=>e.click());
    }
    await waitPhase('gap');
    // This assertion fails on the pre-fix deployment: transition-all delays visibility.
    assert.equal(await face.evaluate(e=>getComputedStyle(e).visibility),'hidden','fixed card must disappear immediately, not under the moving backs');
    if(action==='tap'){
     await page.waitForTimeout(170);
     await page.getByRole('button',{name:'Pausar',exact:true}).evaluate(e=>e.click());
     await page.waitForTimeout(50);
     const position=()=>page.locator('[data-flight="outgoing"]').evaluate(e=>[e.getBoundingClientRect().x,e.getAnimations()[0].currentTime]);
     const frozen=await position();await page.waitForTimeout(500);assert.deepEqual(await position(),frozen);
     await page.screenshot({path:`/tmp/feedback-gap-fixed-${width}.png`});
     await page.getByRole('button',{name:'Reanudar',exact:true}).evaluate(e=>e.click());
    }
    await waitPhase('answer');
    assert.notEqual(await page.locator('.current-card').getAttribute('data-card-id'),oldId);
    assert.equal(await score(),expected);previous=current;
   }
   const frames=await page.evaluate(()=>window.responseFrames);
   const gaps=frames.filter(f=>f.phase==='gap'),feedback=frames.filter(f=>f.phase==='feedback');
   assert.ok(gaps.length>30&&feedback.length>20);
   assert.ok(gaps.every(f=>f.visibility==='hidden'&&f.flights===2&&!f.feedback),'no fixed/feedback ghost during transfer');
   assert.ok(gaps.filter(f=>f.time>120).every(f=>f.previousOpacity<.01),'old previous must exit before incoming card lands');
   assert.ok(feedback.every(f=>f.visibility==='visible'&&f.flights===0),'feedback must precede movement');
   assert.ok(frames.every(f=>!f.overflow));assert.deepEqual(errors,[]);
   console.log(`${engineName} ${width}: ${feedback.length} feedback + ${gaps.length} gap frames; tap, repeated taps, timeout, pause feedback/flight: PASS`);
   await context.close();
  }
 }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1)});
