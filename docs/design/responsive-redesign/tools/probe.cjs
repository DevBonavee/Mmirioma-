/** Read-only Playwright probe of the existing local frontend; no application edits. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  await context.route('**/*', (route) => {
    const u = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(u.hostname) ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/signin', { waitUntil: 'networkidle' });
  const result = await page.evaluate(async () => {
    const { USE_MOCKS } = await import('/src/lib/api/mode.ts');
    const { resetMockDb, read } = await import('/src/mocks/db.ts');
    resetMockDb();
    const s = read();
    return {
      useMocks: USE_MOCKS,
      title: document.title,
      heading: document.querySelector('h1')?.textContent,
      users: s.users.map(({ id, role }) => ({ id, role })),
      customerShapes: Object.entries(s.customers).map(([id, d]) => ({ id, keys: Object.keys(d), addresses: d.addresses.map(({ id, zone_id, zone_label }) => ({ id, zone_id, zone_label })), orders: d.orders.map(({ reference, stage, choice }) => ({ reference, stage, deliveryType: choice?.delivery_type })) })),
      partners: Object.entries(s.partners).map(([id, d]) => ({ id, keys: Object.keys(d), profile: { vehicle: d.profile.vehicle, approval: d.profile.approval_status } })),
      jobs: s.jobs.map(({ reference, stage, partner_id, choice, arrived_at, code_tries_left }) => ({ reference, stage, partner_id, deliveryType: choice?.delivery_type, arrived_at, code_tries_left })),
    };
  });
  console.log(JSON.stringify({ ...result, errors }, null, 2));
  await browser.close();
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
