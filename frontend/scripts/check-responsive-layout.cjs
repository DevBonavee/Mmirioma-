/** Real-browser regression checks for fluid customer and partner layouts.
 * Requires the existing mock Vite app on localhost:5173 and an installed Playwright.
 * Isolated synthetic fixtures; no production API, credentials or storage exports.
 * Run: PLAYWRIGHT_MODULE=/path/to/playwright node scripts/check-responsive-layout.cjs
 * --full checks every captured state; --boundaries adds breakpoint/short-height cases.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.AUDIT_ORIGIN || 'http://127.0.0.1:5173';
const output = process.env.AUDIT_OUTPUT || path.join(os.tmpdir(), 'mmirioma-responsive-checks');
const cases = [];
function add(id, route, account, options = {}) { cases.push({ id, route, account, state: 'default', ...options }); }

add('customer-sign-in', '/signin', 'guest');
add('customer-registration', '/signup', 'guest');
add('customer-registration-validation', '/signup', 'guest', { action: 'submit-empty', state: 'validation-error' });
add('customer-forgot-password', '/forgot-password', 'guest');
add('customer-support-contact', '/support/contact', 'guest');
add('customer-home', '/home', 'customer');
add('customer-home-empty', '/home', 'customer', { empty: true, state: 'empty' });
add('customer-home-loading', '/home', 'customer', { loading: true, state: 'loading' });
add('customer-menu', '/menu', 'customer');
add('customer-delivery-type', '/order', 'customer');
add('customer-keke-quantity', '/order/keke', 'customer');
add('customer-tanker-quantity', '/order/tanker', 'customer', { tanker: true });
add('customer-saved-address-pick', '/order/address', 'customer');
add('customer-delivery-details-saved', '/order/details', 'customer');
add('customer-delivery-details-new', '/order/details?new=1', 'customer');
add('customer-save-address', '/order/save-address', 'customer', { newAddress: true });
add('customer-review-quote', '/order/review', 'customer');
add('customer-review-manual-quote', '/order/review', 'customer', { manual: true, state: 'manual-quote' });
add('customer-orders', '/orders', 'customer');
add('customer-orders-empty', '/orders', 'customer', { empty: true, state: 'empty' });
add('customer-order-detail', '/orders/MO-7KQ2M9XH4T', 'customer');
add('customer-order-not-found', '/orders/MO-AUDIT40400', 'customer', { state: 'error-404' });
add('customer-order-placed', '/orders/MO-7KQ2M9XH4T/placed', 'customer', { orderStage: 'waiting_confirmation', state: 'success' });
add('customer-tracking', '/orders/MO-7KQ2M9XH4T/track', 'customer');
add('customer-delivered-feedback', '/orders/MO-5KL2ZT8QWD/delivered', 'customer', { state: 'success' });
add('customer-receipt', '/orders/MO-5KL2ZT8QWD/receipt', 'customer');
add('customer-addresses', '/addresses', 'customer');
add('customer-addresses-empty', '/addresses', 'customer', { empty: true, state: 'empty' });
add('customer-add-address', '/addresses/new', 'customer');
add('customer-edit-address', '/addresses/addr-home/edit', 'customer');
add('customer-remove-address-dialog', '/addresses', 'customer', { action: 'remove-address', state: 'dialog' });
add('customer-notifications', '/notifications', 'customer');
add('customer-notifications-empty', '/notifications', 'customer', { empty: true, state: 'empty' });
add('customer-support', '/support', 'customer');
add('customer-profile', '/profile', 'customer');
add('customer-email-settings', '/profile/email', 'customer', { mockOnly: true });
add('customer-settings', '/settings', 'customer');
add('customer-change-password', '/profile/password', 'customer');
add('customer-change-phone', '/profile/phone', 'customer');
add('customer-verify-phone', '/verify-phone', 'customer', { unverified: true });
add('customer-verify-phone-code', '/verify-phone', 'customer', { unverified: true, action: 'send-phone-code', state: 'code-entry' });
add('customer-delete-account', '/profile/delete', 'customer');
add('partner-login', '/partner/login', 'guest');
add('partner-registration-keke', '/partner/signup', 'guest');
add('partner-registration-tanker', '/partner/signup', 'guest', { action: 'select-tanker' });
add('partner-registration-validation', '/partner/signup', 'guest', { action: 'submit-empty', state: 'validation-error' });
add('partner-forgot-password', '/partner/forgot-password', 'guest');
add('partner-support-contact', '/partner/contact', 'guest');
add('partner-change-password', '/partner/password', 'driver');
add('partner-verify-phone', '/partner/verify-phone', 'driver', { unverified: true });
add('partner-verify-phone-code', '/partner/verify-phone', 'driver', { unverified: true, action: 'send-phone-code', state: 'code-entry' });

for (const account of ['driver', 'rider']) {
  const base = `/partner/${account}`;
  const ref = account === 'driver' ? 'MO-5KL3ZT8QWE' : 'MO-3HT8WQ2KZP';
  const done = account === 'driver' ? 'MO-6TPB4WX9LR' : 'MO-1QW8ZR5KTD';
  const options = { ref };
  add(`${account}-home`, base, account, { ...options, stage: 'collected' });
  add(`${account}-home-empty`, base, account, { ...options, empty: true, state: 'empty' });
  add(`${account}-home-pending-approval`, base, account, { ...options, pending: true, state: 'pending-approval' });
  add(`${account}-home-loading`, base, account, { ...options, loading: true, state: 'loading' });
  add(`${account}-assigned-delivery`, `${base}/assigned/${ref}`, account, { ...options, stage: 'assigned', state: 'assigned-sheet' });
  add(`${account}-available-deliveries`, `${base}/orders`, account, options);
  add(`${account}-delivery-detail`, `${base}/orders/${ref}`, account, { ...options, stage: 'available' });
  add(`${account}-delivery-not-found`, `${base}/orders/MO-AUDIT40400`, account, { ...options, state: 'error-404' });
  add(`${account}-refill`, `${base}/jobs/${ref}/refill`, account, { ...options, stage: 'accepted' });
  add(`${account}-loading-pickup`, `${base}/jobs/${ref}/${account === 'driver' ? 'loading' : 'pickup'}`, account, { ...options, stage: 'accepted' });
  add(`${account}-go-to-customer`, `${base}/jobs/${ref}/customer`, account, { ...options, stage: 'collected' });
  add(`${account}-arrived`, `${base}/jobs/${ref}/arrived`, account, { ...options, stage: 'collected', arrived: true });
  add(`${account}-unreachable`, `${base}/jobs/${ref}/unreachable`, account, { ...options, stage: 'collected', arrived: true });
  add(`${account}-unloading-before-code`, `${base}/jobs/${ref}/code`, account, { ...options, stage: 'collected', arrived: true, unloading: true, state: 'waiting-for-unloading-completion' });
  add(`${account}-delivery-code`, `${base}/jobs/${ref}/code`, account, { ...options, stage: 'collected', arrived: true, unloading: true, codeIssued: true, state: 'code-entry' });
  add(`${account}-delivery-code-locked`, `${base}/jobs/${ref}/code`, account, { ...options, stage: 'collected', arrived: true, unloading: true, codeIssued: true, locked: true, state: 'locked-error' });
  add(`${account}-delivery-code-sms-failed`, `${base}/jobs/${ref}/code`, account, { ...options, stage: 'collected', arrived: true, unloading: true, codeIssued: true, smsFailed: true, state: 'sms-error' });
  add(`${account}-delivery-failed`, `${base}/jobs/${ref}/failed`, account, { ...options, stage: 'failed', state: 'failed-delivery' });
  add(`${account}-delivery-done`, `${base}/jobs/${done}/done`, account, { ref: done, stage: 'delivered', state: 'success' });
  add(`${account}-record-cash`, `${base}/jobs/${ref}/cash`, account, { ref, stage: 'delivered', cashPending: true });
  add(`${account}-record-cash-closed`, `${base}/jobs/${done}/cash`, account, { ref: done, stage: 'delivered', state: 'blocked-no-cash-record' });
  add(`${account}-cash`, `${base}/cash`, account, options);
  add(`${account}-cash-handover`, `${base}/cash/handover`, account, { ...options, stage: 'delivered', cashPending: true, seedCollection: true });
  add(`${account}-decline`, `${base}/jobs/${ref}/decline`, account, { ...options, stage: 'assigned' });
  for (const suffix of ['menu', 'history', 'notifications', 'vehicle', 'issue', 'profile', 'settings']) {
    add(`${account}-${suffix}`, `${base}/${suffix}`, account, options);
  }
}

async function fixture(page, scenario) {
  await page.goto(`${origin}/signin`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async (c) => {
    const { USE_MOCKS } = await import('/src/lib/api/mode.ts');
    if (!USE_MOCKS) throw new Error('Refusing capture: mock mode is required.');
    const db = await import('/src/mocks/db.ts');
    const auth = await import('/src/mocks/authMock.ts');
    const draftModule = await import('/src/features/customer/order/draft.ts');
    db.resetMockDb();
    sessionStorage.clear();
    const id = c.account === 'customer' ? 'user-adaeze' : c.account === 'driver' ? 'user-emeka' : c.account === 'rider' ? 'user-chinedu' : null;
    db.mutate((s) => {
      s.users.forEach((u, i) => {
        u.name = `SIMULATED ${u.role === 'customer' ? 'Customer' : u.role === 'driver' ? 'Partner' : 'Staff'} ${i + 1}`;
        u.phone = '+234800000' + String(100 + i).padStart(4, '0');
        if (u.id === id && c.unverified) u.phone_verified = false;
      });
      Object.values(s.customers).forEach((d) => {
        d.profile.email = 'audit@example.invalid';
        d.profile.photo_url = null;
        d.addresses.forEach((a, i) => { a.address = `${10 + i} Example Lane, Enugu (SIMULATED)`; a.landmark = 'SIMULATED blue gate'; a.location = null; });
        d.orders.forEach((o) => {
          o.receiver_name = 'SIMULATED Receiver'; o.receiver_phone = '+2348000000900';
          o.address = '10 Example Lane, Enugu (SIMULATED)'; o.landmark = 'SIMULATED blue gate';
          o.instructions = 'SIMULATED instruction: tank beside the gate.'; o.delivery_code = null;
          if (o.partner) { o.partner.name = 'SIMULATED Partner'; o.partner.phone = '+2348000000901'; }
        });
      });
      s.jobs.forEach((j) => {
        j.customer.name = 'SIMULATED delivery address'; j.customer.address = '10 Example Lane, Enugu (SIMULATED)';
        j.customer.contact_name = 'SIMULATED Receiver'; j.customer.phone = '+2348000000900'; j.customer.landmark = 'SIMULATED blue gate';
        j.station.name = 'SIMULATED Refill Station'; j.station.address = '1 Example Source Road, Enugu (SIMULATED)';
        j.instructions = 'SIMULATED instruction: tank beside the gate.'; j.mock_code = null;
      });
      Object.values(s.partners).forEach((d, i) => { d.profile.vehicle.plate = `DEMO-${String(i + 1).padStart(3, '0')}`; });
      if (id) auth.startSession(s, id);
      if (c.account === 'customer') {
        const d = s.customers[id];
        if (c.empty) { d.orders = []; d.addresses = []; d.notifications = []; d.tickets = []; }
        if (c.orderStage) d.orders.find((o) => o.reference === 'MO-7KQ2M9XH4T').stage = c.orderStage;
      }
      if (id && s.partners[id]) {
        if (c.pending) { s.partners[id].profile.approval = 'pending'; s.partners[id].profile.online = false; s.jobs = s.jobs.filter((j) => j.partner_id !== id && j.reference !== c.ref); }
        if (c.empty) s.jobs = [];
        const j = s.jobs.find((j) => j.reference === c.ref);
        if (j) {
          j.stage = c.stage || 'assigned'; j.partner_id = j.stage === 'available' ? null : id;
          if (['accepted', 'collected'].includes(j.stage)) s.jobs.forEach((other) => { if (other !== j && other.partner_id === id && ['assigned', 'accepted', 'collected'].includes(other.stage)) { other.stage = 'available'; other.partner_id = null; } });
          j.hold = null; j.arrived_at = c.arrived ? new Date(Date.now() - 12 * 60_000).toISOString() : null;
          j.mock_unloading_started = Boolean(c.unloading); j.code_tries_left = c.codeIssued ? (c.locked ? 0 : 5) : null;
          j.code_resend_at = null; j.code_sms_status = c.smsFailed ? 'failed' : c.codeIssued ? 'sent' : null;
          j.contact_attempts = []; j.can_start_unloading = Boolean(c.arrived && !c.unloading);
          j.accepted_at = new Date(Date.now() - 30 * 60_000).toISOString();
          if (['collected', 'delivered'].includes(j.stage)) { j.collected_at = new Date(Date.now() - 20 * 60_000).toISOString(); j.pickup = { loaded: true, receipt: true, photo_url: null, gallons_loaded: 1000 }; }
          if (j.stage === 'delivered') j.delivered_at = new Date(Date.now() - 5 * 60_000).toISOString();
          if (c.cashPending) j.payment_status = 'pending_collection';
          if (j.stage === 'failed') { j.failed_at = new Date(Date.now() - 5 * 60_000).toISOString(); j.ended = { kind: 'failed', reason_code: 'customer_unreachable', note: 'SIMULATED unreachable-customer example', by: id, at: j.failed_at }; }
        }
      }
    });
    if (c.seedCollection) {
      const cash = await import('/src/mocks/partnerCashMock.ts');
      const state = db.read();
      const job = state.jobs.find((j) => j.reference === c.ref);
      const due = cash.jobCash(state, job)?.amount_due_minor_units;
      if (due == null) throw new Error('Synthetic cash fixture has no amount due.');
      await cash.recordCash(c.ref, { amount_minor_units: due, note: null });
    }
    if (c.account === 'customer') {
      const d = draftModule.newDraft();
      d.delivery_type = c.tanker ? 'tanker' : 'keke';
      d.receiver_name = 'SIMULATED Receiver'; d.receiver_phone = '+2348000000900';
      d.address_id = c.newAddress || c.manual || c.empty ? null : 'addr-home';
      d.new_address = { address: '10 Example Lane, Enugu (SIMULATED)', landmark: 'SIMULATED blue gate', label: 'Audit address', save: 'another', zone: c.manual ? 'not_listed' : { id: 'zone-gra', name: 'GRA' }, location: null };
      draftModule.saveDraft(d);
    }
  }, scenario);
}

async function action(page, scenario) {
  if (scenario.action === 'submit-empty') {
    const form = page.locator('form').first();
    if (await form.count()) await form.evaluate((f) => f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await page.waitForTimeout(250);
  } else if (scenario.action === 'select-tanker') {
    const option = page.getByRole('button', { name: /tanker/i }).first();
    if (await option.count()) await option.click();
    else { const text = page.getByText('Tanker', { exact: true }).first(); if (await text.count()) await text.click(); }
  } else if (scenario.action === 'remove-address') {
    const remove = page.getByRole('button', { name: /remove/i }).first();
    if (await remove.count()) await remove.click();
  } else if (scenario.action === 'send-phone-code') {
    const send = page.getByRole('button', { name: /send.*code/i }).first();
    if (await send.count()) { await send.click(); await page.waitForTimeout(500); }
  }
}

async function measure(page) {
  return page.evaluate(() => {
    const box = (el) => {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      return { tag: el.tagName.toLowerCase(), width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10, x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10, maxWidth: s.maxWidth, position: s.position, overflowX: s.overflowX, overflowY: s.overflowY, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
    };
    const frame = document.querySelector('.h-dvh');
    const mains = [...document.querySelectorAll('main')];
    const auth = document.querySelector('.mo-auth');
    const authLayout = auth ? Object.fromEntries(['hero', 'main', 'form'].map((name) => [name, box(auth.querySelector(`.mo-auth-${name}`))])) : null;
    const outliers = [...document.querySelectorAll('button,a,input,select,textarea,h1,h2,[role="dialog"]')].filter((el) => {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && (r.left < -1 || r.right > innerWidth + 1);
    }).slice(0, 20).map((el) => ({ role: el.getAttribute('role'), tag: el.tagName.toLowerCase(), label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 100), ...box(el) }));
    return { authLayout, viewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight, frame: frame ? box(frame) : null, mains: mains.map(box), dialogs: [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].map(box), headings: [...document.querySelectorAll('h1,h2')].map((e) => e.textContent.trim()).slice(0, 10), navs: [...document.querySelectorAll('nav')].filter((e) => e.getBoundingClientRect().width).map((e) => ({ label: e.getAttribute('aria-label'), ...box(e) })), geometryOutliers: outliers, loadingVisible: Boolean(document.querySelector('.skeleton,.animate-drop-bob')), alerts: [...document.querySelectorAll('[role="alert"]')].map((e) => e.textContent.trim().slice(0, 180)) };
  });
}

const core = new Set([
  'customer-sign-in', 'customer-registration', 'customer-home', 'customer-home-empty',
  'customer-delivery-type', 'customer-keke-quantity', 'customer-tanker-quantity',
  'customer-delivery-details-new', 'customer-review-quote', 'customer-orders', 'customer-order-detail',
  'customer-tracking', 'customer-profile', 'customer-add-address', 'customer-remove-address-dialog',
  'partner-login', 'partner-registration-tanker', 'partner-change-password',
  'driver-home', 'driver-home-empty', 'driver-assigned-delivery', 'driver-available-deliveries',
  'driver-delivery-detail', 'driver-refill', 'driver-loading-pickup', 'driver-delivery-code',
  'driver-delivery-code-locked', 'driver-record-cash', 'driver-cash-handover', 'driver-profile',
  'rider-home', 'rider-available-deliveries', 'rider-loading-pickup', 'rider-delivery-code',
]);
const standard = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 }];
const onlyIndex = process.argv.indexOf('--only');
const only = onlyIndex >= 0 ? new RegExp(process.argv[onlyIndex + 1]) : null;
const boundaries = [
  { width: 360, height: 640 }, { width: 600, height: 800 }, { width: 1024, height: 768 },
  { width: 1279, height: 800 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 },
  { width: 1440, height: 568 }, { width: 390, height: 568 },
];
const boundaryCases = new Set(['customer-home', 'customer-order-detail', 'driver-home', 'driver-assigned-delivery', 'driver-refill', 'rider-delivery-code', 'customer-sign-in', 'customer-registration', 'partner-login', 'partner-registration-tanker']);
const shotCases = new Set(['customer-home', 'customer-delivery-details-new', 'driver-home', 'driver-available-deliveries', 'driver-assigned-delivery', 'driver-refill', 'rider-delivery-code', 'customer-sign-in', 'customer-registration', 'partner-login', 'partner-registration-tanker']);

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    const viewports = [...standard, ...(process.argv.includes('--boundaries') ? boundaries : [])];
    // Three independent viewport workers keep the browser checks practical on laptops.
    let next = 0;
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (next < viewports.length) {
        const viewport = viewports[next++];
        const isBoundary = !standard.includes(viewport);
        const selected = cases.filter((c) => only ? only.test(c.id) : (isBoundary ? boundaryCases.has(c.id) : process.argv.includes('--full') || core.has(c.id)));
        const context = await browser.newContext({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block', timezoneId: 'Africa/Lagos', locale: 'en-GB' });
        await context.route('**/*', (route) => {
          const url = new URL(route.request().url());
          return url.origin === new URL(origin).origin && !url.pathname.startsWith('/api/') ? route.continue() : route.abort();
        });
        const page = await context.newPage();
        let pageErrors = [];
        page.on('pageerror', (e) => pageErrors.push(e.message));
        for (const scenario of selected) {
          const result = { id: scenario.id, viewport, route: scenario.route };
          pageErrors = [];
          let delayHandler;
          try {
            await fixture(page, scenario);
            if (scenario.loading) {
              delayHandler = async (route) => { await new Promise((r) => setTimeout(r, 4000)); await route.continue().catch(() => {}); };
              await page.route('**/src/mocks/*Mock.ts*', delayHandler);
            }
            await page.goto(`${origin}${scenario.route}`, { waitUntil: scenario.loading ? 'domcontentloaded' : 'networkidle' });
            if (scenario.loading) await page.waitForTimeout(650);
            else {
              await page.waitForFunction(() => !document.querySelector('.skeleton,.animate-drop-bob'), null, { timeout: 20000 });
              await action(page, scenario);
              await page.evaluate(() => document.fonts.ready);
            }
            const m = await measure(page);
            result.measurements = m;
            assert.equal(new URL(page.url()).pathname + new URL(page.url()).search, scenario.route, 'Unexpected route redirect');
            assert.deepEqual(pageErrors, [], 'Browser runtime errors');
            assert.ok(m.documentWidth <= viewport.width, 'Document overflows horizontally');
            assert.deepEqual(m.geometryOutliers, [], 'Interactive content spills past viewport');
            assert.ok(m.frame, 'Page frame is missing');
            const expectedWidth = viewport.width;
            assert.ok(Math.abs(m.frame.width - expectedWidth) <= 1, `Frame still narrow: ${m.frame.width}, expected ${expectedWidth}`);
            if (scenario.account === 'guest') {
              assert.ok(m.authLayout, 'Public page is missing its responsive account layout');
              const { hero, main, form } = m.authLayout;
              assert.ok(form.width >= Math.min(280, viewport.width - 44) && form.width <= 641, 'Inputs have an unreadable line length');
              if (viewport.width >= 1024) {
                assert.ok(Math.abs(hero.y - main.y) < 1 && Math.abs(hero.x + hero.width - main.x) < 1, 'Desktop hero and form must share a row');
                assert.ok(Math.abs(hero.width + main.width - viewport.width) < 2, 'Desktop columns leave unused outer space');
              } else {
                assert.ok(Math.abs(hero.width - viewport.width) < 1 && main.y >= hero.y + hero.height - 1, 'Small-screen content must stack at full width');
              }
              const lastAction = page.locator('.mo-auth-main button[type="submit"], .mo-auth-main a').last();
              if (await lastAction.count()) {
                await lastAction.scrollIntoViewIfNeeded();
                assert.ok(await lastAction.evaluate((el) => {
                  // Inline links can wrap; their union box includes empty space.
                  return [...el.getClientRects()].some((r) => {
                    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                    return r.width > 0 && r.height > 0 && hit && (hit === el || el.contains(hit));
                  });
                }), 'Last account action is covered or unreachable');
              }
              await page.evaluate(() => window.scrollTo(0, 0));
            }
            if (scenario.id.endsWith('home') && !scenario.loading) {
              const nav = page.getByRole('navigation', { name: scenario.account === 'customer' ? 'Main' : scenario.account === 'driver' ? 'Driver' : 'Rider', exact: true });
              assert.equal(await nav.count(), 1, 'Exactly one visible primary navigation');
              if (viewport.width < 1280) {
                const fill = await nav.evaluate((el) => {
                  const cs = getComputedStyle(el);
                  return { available: el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), links: [...el.querySelectorAll('a')].reduce((n, a) => n + a.getBoundingClientRect().width, 0) };
                });
                assert.ok(Math.abs(fill.available - fill.links) < 2, 'Enabled tabs leave an empty track');
              }
            }
            if (scenario.id === 'rider-delivery-code') {
              await page.keyboard.type('123');
              assert.equal(await page.getByRole('group', { name: 'Code entered: 3 of 6 digits' }).count(), 1, 'Keyboard entry broken');
              await page.keyboard.press('Backspace');
              assert.equal(await page.getByRole('group', { name: 'Code entered: 2 of 6 digits' }).count(), 1, 'Keyboard delete broken');
            }
            if (scenario.id.includes('assigned-delivery')) {
              const dialog = page.getByRole('dialog');
              const accept = dialog.getByRole('button', { name: 'Start: go to refill station' });
              await accept.scrollIntoViewIfNeeded();
              assert.ok(await accept.evaluate((el) => {
                const r = el.getBoundingClientRect();
                const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                return hit && (hit === el || el.contains(hit));
              }), 'Assignment action is covered or unreachable');
            }
            if (!isBoundary && (shotCases.has(scenario.id) || only)) {
              result.screenshot = `${viewport.width}x${viewport.height}-${scenario.id}.png`;
              await page.screenshot({ path: path.join(output, result.screenshot), animations: 'disabled', style: "html::after{content:'SIMULATED DATA · RESPONSIVE FIX CHECK';position:fixed;bottom:0;left:0;z-index:2147483647;background:#0a2540;color:white;font:10px sans-serif;padding:3px}" });
            }
            result.status = 'passed';
          } catch (error) {
            result.status = 'failed';
            result.error = error.message;
            await page.screenshot({ path: path.join(output, `failure-${viewport.width}x${viewport.height}-${scenario.id}.png`), animations: 'disabled' }).catch(() => {});
            console.log(`${viewport.width}x${viewport.height} ${scenario.id}: ${error.message.split('\n')[0]}`);
          } finally {
            if (delayHandler) await page.unroute('**/src/mocks/*Mock.ts*', delayHandler);
          }
          results.push(result);
        }
        await context.close();
        console.log(`${viewport.width}x${viewport.height}: checked ${selected.length} pages/states`);
      }
    }));
  } finally { await browser.close(); }
  const failed = results.filter((r) => r.status === 'failed');
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ browser: browser.version(), simulated: true, results }, null, 2));
  console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, output }));
  if (failed.length) process.exitCode = 1;
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
