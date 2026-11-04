/** Browser checks for the signup tour, replay, logo destinations and refreshed marketing art.
 * Uses isolated synthetic accounts on the existing mock Vite server only.
 * Run: PLAYWRIGHT_MODULE=/path/to/playwright node scripts/check-first-time-tour.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.AUDIT_ORIGIN || 'http://127.0.0.1:5173';
const output = process.env.AUDIT_OUTPUT || path.join(os.tmpdir(), 'mmirioma-first-time-tour');

async function account(page, audience, { pending = true, busy = false } = {}) {
  await page.goto(origin);
  return page.evaluate(async ({ audience, pending, busy }) => {
    const { USE_MOCKS } = await import('/src/lib/api/mode.ts');
    if (!USE_MOCKS) throw new Error('Refusing tour checks outside mock mode.');
    const db = await import('/src/mocks/db.ts');
    const auth = await import('/src/mocks/authMock.ts');
    const { saveTourStatus } = await import('/src/features/onboarding/tourStorage.ts');
    const id = audience === 'customer' ? 'user-adaeze' : audience === 'keke' ? 'user-chinedu' : 'user-emeka';
    db.resetMockDb();
    localStorage.removeItem(`mmirioma:tour:v1:${audience === 'customer' ? 'customer' : 'driver'}:${id}`);
    db.mutate((state) => {
      const user = state.users.find((u) => u.id === id);
      user.name = 'Sample Tour'; user.phone = '+2348000000900';
      if (!busy) state.jobs = [];
      else {
        state.jobs.forEach((job) => { if (job.partner_id === id) { job.stage = 'available'; job.partner_id = null; } });
        const assigned = state.jobs.find((job) => job.reference === 'MO-3HT8WQ2KZP');
        assigned.stage = 'assigned'; assigned.partner_id = id;
      }
      if (audience === 'customer') {
        state.customers[id].profile.name = user.name;
        state.customers[id].orders = []; state.customers[id].addresses = [];
      } else {
        state.partners[id].profile.name = user.name;
        state.partners[id].profile.phone = user.phone;
        state.partners[id].profile.vehicle.plate = 'SAMPLE';
      }
      auth.startSession(state, id);
    });
    if (pending) saveTourStatus(db.read().users.find((u) => u.id === id), 'pending');
    return `mmirioma:tour:v1:${audience === 'customer' ? 'customer' : 'driver'}:${id}`;
  }, { audience, pending, busy });
}

async function assertDialog(page) {
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  assert.equal(await dialog.evaluate((el) => el.matches(':modal')), true, 'Guide must use the native modal top layer');
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Tab');
    assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement)), true, 'Focus escaped the guide');
  }
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Shift+Tab');
    assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement)), true, 'Reverse focus escaped the guide');
  }
  assert.equal(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), true, 'Guide overflows horizontally');
  const next = dialog.getByRole('button', { name: /Show me around|Next|Finish tour/ });
  await next.scrollIntoViewIfNeeded();
  assert.equal(await next.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.height >= 48; }), true, 'Guide action is clipped or too small');
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const width of [320, 390, 720, 768, 1440]) {
      // 720 x 500 is the effective CSS viewport of a 1440 x 1000 window at 200% zoom.
      const context = await browser.newContext({ viewport: { width, height: width === 720 ? 500 : width < 768 ? 844 : 1000 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        return url.origin === origin && !url.pathname.startsWith('/api/') ? route.continue() : route.abort();
      });
      try {
        for (const audience of ['customer', 'keke', 'tanker']) {
          const page = await context.newPage();
          const base = audience === 'customer' ? '/home' : audience === 'keke' ? '/partner/rider' : '/partner/driver';
          const marker = await account(page, audience);
          await page.goto(`${origin}${base}`);
          await assertDialog(page);
          await page.screenshot({ path: path.join(output, `${width}-${audience}-welcome.png`), animations: 'disabled' });
          await page.getByRole('button', { name: 'Show me around' }).click();
          const count = audience === 'customer' ? 4 : 5;
          for (let step = 1; step <= count; step++) {
            await assertDialog(page);
            assert.equal(await page.getByText(`Step ${step} of ${count}`, { exact: true }).count(), 1);
            if (step === count) {
              await page.screenshot({ path: path.join(output, `${width}-${audience}-last-step.png`), animations: 'disabled' });
              await page.getByRole('button', { name: 'Finish tour' }).click();
            } else await page.getByRole('button', { name: 'Next', exact: true }).click();
          }
          assert.equal(await page.evaluate((marker) => localStorage.getItem(marker), marker), 'completed');
          await page.reload();
          await page.getByRole('link', { name: 'MmiriOma, home' }).first().waitFor();
          assert.equal(await page.getByRole('dialog').count(), 0, 'Completion must survive reload');
          const menu = audience === 'customer' ? '/menu' : `${base}/menu`;
          await page.goto(`${origin}${menu}`);
          const replay = page.getByRole('button', { name: 'Take a quick tour' });
          await replay.click();
          await assertDialog(page);
          await page.keyboard.press('Escape');
          assert.equal(await page.getByRole('dialog').count(), 0);
          assert.equal(new URL(page.url()).pathname, menu, 'Escape must close only the guide');
          assert.equal(await replay.evaluate((el) => el === document.activeElement), true, 'Replay focus not restored');
          await page.goto(`${origin}${base}`);
          const logo = page.getByRole('link', { name: 'MmiriOma, home' }).first();
          assert.equal(await logo.getAttribute('href'), '/');
          await logo.click();
          await page.getByRole('heading', { name: /Water at\s*your gate/ }).waitFor();
          assert.equal(new URL(page.url()).pathname, '/');
          results.push({ width, audience, status: 'passed' });
          await page.close();
        }
        const page = await context.newPage();
        await account(page, 'keke', { busy: true });
        await page.goto(`${origin}/partner/rider`);
        await page.getByRole('dialog', { name: 'New order assigned' }).waitFor();
        assert.equal(await page.locator('dialog.mo-tour').count(), 0, 'Assignment must take priority');
        await account(page, 'customer', { pending: false });
        await page.goto(`${origin}/home`);
        await page.getByText('Order with Keke', { exact: true }).waitFor();
        assert.equal(await page.getByRole('dialog').count(), 0, 'Existing login must not trigger guide');
        await page.goto(origin);
        await page.locator('#drivers').scrollIntoViewIfNeeded();
        await page.locator('.mk-drivers-photo').evaluate((el) => { el.loading = 'eager'; return el.decode(); });
        assert.equal(await page.locator('.mk-drivers-photo').evaluate((el) => el.naturalWidth), 1983);
        await page.locator('.mk-drivers').screenshot({ path: path.join(output, `${width}-driver-banner.png`), animations: 'disabled' });
        await page.locator('#download').scrollIntoViewIfNeeded();
        const phones = page.locator('.mk-app-phone img');
        assert.equal(await phones.count(), 2);
        for (const phone of await phones.all()) {
          await phone.evaluate((el) => el.decode());
          assert.equal(await phone.evaluate((el) => el.naturalWidth), 1170);
        }
        await page.locator('#download').screenshot({ path: path.join(output, `${width}-install-cards.png`), animations: 'disabled' });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Marketing page overflows');
        results.push({ width, scenario: 'priority-existing-login-marketing', status: 'passed' });
      } finally { await context.close(); }
      console.log(`${width}: tour, replay, logo and artwork checks passed.`);
    }
    // Regression: an existing modal takes priority even on the first home mount.
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      await context.route('**/*', (route) => { const url = new URL(route.request().url()); return url.origin === origin && !url.pathname.startsWith('/api/') ? route.continue() : route.abort(); });
      try {
        const page = await context.newPage();
        await account(page, 'customer');
        await page.addInitScript(() => {
          if (location.pathname !== '/home') return;
          const observer = new MutationObserver(() => {
            if (!document.body) return;
            observer.disconnect();
            const modal = document.createElement('dialog');
            modal.id = 'sample-existing-modal';
            modal.setAttribute('aria-label', 'Sample install dialog');
            modal.textContent = 'Sample install dialog';
            document.body.append(modal);
            modal.showModal();
          });
          observer.observe(document, { childList: true, subtree: true });
        });
        await page.goto(`${origin}/home`);
        await page.getByText('Order with Keke', { exact: true }).waitFor();
        assert.equal(await page.locator('dialog.mo-tour').count(), 0, 'Existing modal must take priority');
        await page.locator('#sample-existing-modal').evaluate((el) => { el.close(); el.remove(); });
        await page.locator('dialog.mo-tour').waitFor();
        await page.getByRole('button', { name: 'Skip tour' }).click();
        results.push({ scenario: 'existing-modal-priority', status: 'passed' });
      } finally { await context.close(); }
    }
    // Regression: readable but full storage must not leave Skip trapped open.
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      await context.route('**/*', (route) => { const url = new URL(route.request().url()); return url.origin === origin && !url.pathname.startsWith('/api/') ? route.continue() : route.abort(); });
      try {
        const page = await context.newPage();
        await account(page, 'customer');
        await page.addInitScript(() => {
          const write = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) {
            if (key.startsWith('mmirioma:tour:')) throw new DOMException('Sample quota failure', 'QuotaExceededError');
            return write.call(this, key, value);
          };
        });
        await page.goto(`${origin}/home`);
        await page.locator('dialog.mo-tour').waitFor();
        await page.getByRole('button', { name: 'Skip tour' }).click();
        assert.equal(await page.locator('dialog.mo-tour').count(), 0);
        // Check the live app rather than importing another Vite/HMR module
        // instance, which would have a separate in-memory fallback map.
        await page.getByRole('link', { name: 'Open menu', exact: true }).click();
        await page.getByRole('link', { name: 'Home', exact: true }).click();
        await page.getByText('Order with Keke', { exact: true }).waitFor();
        assert.equal(await page.locator('dialog.mo-tour').count(), 0, 'Dismissal must survive client-side navigation');
        results.push({ scenario: 'full-storage-dismissal', status: 'passed' });
      } finally { await context.close(); }
    }
    // Use the actual forms to verify signup -> existing verification -> dashboard guide.
    for (const audience of ['customer', 'keke', 'tanker']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      await context.route('**/*', (route) => { const url = new URL(route.request().url()); return url.origin === origin && !url.pathname.startsWith('/api/') ? route.continue() : route.abort(); });
      try {
        const page = await context.newPage();
        await page.goto(origin);
        await page.evaluate(async () => {
          const { USE_MOCKS } = await import('/src/lib/api/mode.ts');
          if (!USE_MOCKS) throw new Error('Refusing signup checks outside mock mode.');
          const db = await import('/src/mocks/db.ts'); db.resetMockDb();
        });
        await page.goto(`${origin}${audience === 'customer' ? '/signup' : '/partner/signup'}`);
        await page.getByLabel('Full name', { exact: true }).fill(`Sample New ${audience}`);
        await page.getByLabel('Phone number', { exact: true }).fill('08000009201');
        await page.getByLabel('Password', { exact: true }).fill('FictionalPreview!2026');
        await page.getByLabel('Confirm password', { exact: true }).fill('FictionalPreview!2026');
        await page.getByRole('checkbox', { name: /18 or older/ }).check();
        if (audience !== 'customer') {
          if (audience === 'tanker') await page.getByRole('button', { name: /Tanker/ }).click();
          await page.getByLabel('Plate number', { exact: true }).fill('SAMPLE-001');
          const zones = page.getByLabel('Area you work in');
          await zones.locator('option').nth(1).waitFor({ state: 'attached' });
          await zones.selectOption({ index: 1 });
          if (audience === 'tanker') await page.getByLabel(/gallons/i).fill('1000');
        }
        await page.getByRole('button', { name: 'Create account', exact: true }).click();
        await page.waitForURL(/verify-phone/);
        assert.equal(await page.locator('dialog.mo-tour').count(), 0, 'Guide must not cover verification');
        await page.getByRole('button', { name: 'Do this later' }).click();
        await page.getByRole('dialog').waitFor();
        assert.equal(await page.getByRole('heading', { name: 'A quick look around' }).count(), 1);
        await page.getByRole('button', { name: 'Skip tour' }).click();
        results.push({ audience, scenario: 'signup-through-verification', status: 'passed' });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ passed: results.length, output }));
})().catch((error) => { console.error(error); process.exitCode = 1; });
