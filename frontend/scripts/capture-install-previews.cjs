/** Capture crisp install-card previews from the real app, with synthetic empty accounts only.
 * Requires the mock Vite server at localhost:5173 and an existing Playwright installation.
 * Run: PLAYWRIGHT_MODULE=/path/to/playwright node scripts/capture-install-previews.cjs
 * No production requests, credentials or customer records are used.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.AUDIT_ORIGIN || 'http://127.0.0.1:5173';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const audience of ['customer', 'partner']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 3, serviceWorkers: 'block', reducedMotion: 'reduce' });
      try {
        await context.route('**/*', (route) => {
          const url = new URL(route.request().url());
          return url.origin === origin && !url.pathname.startsWith('/api/') ? route.continue() : route.abort();
        });
        const page = await context.newPage();
        await page.goto(origin);
        await page.evaluate(async (audience) => {
          const { USE_MOCKS } = await import('/src/lib/api/mode.ts');
          if (!USE_MOCKS) throw new Error('Preview captures require mock mode.');
          const db = await import('/src/mocks/db.ts');
          const auth = await import('/src/mocks/authMock.ts');
          db.resetMockDb();
          db.mutate((s) => {
            const id = audience === 'customer' ? 'user-adaeze' : 'user-chinedu';
            const user = s.users.find((u) => u.id === id);
            user.name = audience === 'customer' ? 'Sample Customer' : 'Sample Partner';
            user.phone = '+2348000000900';
            s.jobs = [];
            if (audience === 'customer') {
              const account = s.customers[id];
              account.profile.name = user.name;
              account.orders = []; account.addresses = []; account.notifications = [];
            } else {
              const account = s.partners[id];
              account.profile.name = user.name;
              account.profile.phone = user.phone;
              account.profile.vehicle.plate = 'SAMPLE';
              account.profile.online = false;
              account.notifications = [];
            }
            auth.startSession(s, id);
          });
        }, audience);
        await page.goto(`${origin}${audience === 'customer' ? '/home' : '/partner/rider'}`);
        if (audience === 'customer') await page.getByText('Order with Keke', { exact: true }).waitFor();
        else await page.getByRole('button', { name: /You are offline Go online/ }).waitFor();
        await page.waitForTimeout(1500);
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((img) => img.decode().catch(() => {}))); });
        assert.equal(await page.getByRole('dialog').count(), 0);
        await page.screenshot({
          path: path.resolve(__dirname, `../public/marketing/app-preview-${audience}.png`),
          animations: 'disabled',
          style: "html::after{content:'SAMPLE APP PREVIEW';position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#0a2540;color:white;text-align:center;font:bold 10px sans-serif;letter-spacing:1px;padding:2px}"
        });
        console.log(`Saved ${audience} preview at 1170 x 2340.`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
