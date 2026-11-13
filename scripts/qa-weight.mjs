/**
 * Page weight of the production build: bytes transferred before any scroll, and after scrolling the page.
 *   npm run build && npm run preview -- --port 4322    then    node scripts/qa-weight.mjs [url]
 * Also reports console errors and which quality tier the device got.
 */
import { launch } from './qa-browser.mjs';

const url = process.argv[2] ?? 'http://localhost:4322/';
const browser = await launch();

for (const device of [
  { name: 'desktop 1440x900', viewport: { width: 1440, height: 900 } },
  { name: 'mobile 390x844', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
]) {
  const { name, ...options } = device;
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  const sizes = new Map();
  const types = new Map();
  cdp.on('Network.responseReceived', (e) => types.set(e.requestId, e.type));
  cdp.on('Network.loadingFinished', (e) => sizes.set(e.requestId, e.encodedDataLength));
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));

  const report = (label) => {
    const by = {};
    let total = 0;
    for (const [id, bytes] of sizes) { const t = types.get(id) ?? 'Other'; by[t] = (by[t] ?? 0) + bytes; total += bytes; }
    const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
    console.log(`${name} · ${label}: ${kb(total)}  (${Object.entries(by).map(([t, n]) => `${t} ${kb(n)}`).join(' · ')})`);
  };

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(8000);                       // intro + hero video — NO interaction: what loads by itself
  report('initial (no interaction)');
  await page.mouse.move(200, 300); await page.mouse.move(260, 340);
  await page.evaluate(() => window.dispatchEvent(new Event('touchstart')));
  await page.waitForTimeout(5000);                       // first interaction → WebGL chunk
  report('after first interaction (no scroll)');
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 300) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(3000);
  report('after full scroll');
  console.log(`  tier: ${await page.evaluate(() => document.documentElement.dataset.tier)} · WebGL live: ${
    await page.evaluate(() => !!document.querySelector('[data-flight].is-live'))} · errors: ${errors.length ? errors.join(' | ') : 'none'}`);
  await context.close();
}
await browser.close();
