// Run against a deployed build with Playwright installed externally:
// PLAYWRIGHT_MODULE=/path/to/playwright node scripts/check-responsive.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const url = process.env.TEST_URL || 'https://memory-cards.maxflow.ink';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const [width, height, mobile] of [[320,568,true],[375,667,true],[390,664,true],[430,739,true],[1280,900,false]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      assert.equal((await page.goto(url, { waitUntil: 'networkidle' })).status(), 200);
      const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
      await noOverflow();
      if (mobile) {
        await page.getByRole('button', { name: 'Toca para comenzar' }).tap();
      } else {
        await page.keyboard.press('Space');
      }
      await page.waitForTimeout(2950);
      async function checkBoard() {
        await noOverflow();
        for (const selector of ['.previous-card .card-back', '.current-card .card-face', '.answer-button']) {
          const box = await page.locator(selector).boundingBox();
          assert.ok(box && box.x >= 0 && box.x + box.width <= width, `${selector} horizontal bounds at ${width}`);
          if (mobile) assert.ok(box.y >= 0 && box.y + box.height <= height - 16, `${selector} vertical bounds at ${width}: ${JSON.stringify(box)}`);
        }
      }
      await checkBoard();
      if (mobile) {
        assert.equal(await page.locator('.answer-button').innerText(), '¡SÍ COINCIDEN!\nToca aquí (+100 pts)');
        await page.locator('.answer-button').tap();
      } else {
        await page.keyboard.press('Enter');
      }
      assert.ok(await page.locator('.answer-button').isDisabled());
      await page.waitForTimeout(800);
      await page.waitForTimeout(7000);
      await page.getByText("5/15", { exact: true }).first().waitFor();
      await checkBoard(); // history now contains three cards
      await page.screenshot({ path: `/tmp/memory-cards-responsive-${width}.png`, fullPage: false });
      assert.deepEqual(errors, []);
      console.log(`${width}x${height}: no overflow, cards/control in bounds, ${mobile ? 'touch' : 'keyboard'} answer and timer progression OK`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
