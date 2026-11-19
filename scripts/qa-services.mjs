/**
 * Visual QA of the Services page: screenshots while scrolling down, then back up, then every tab.
 *   node scripts/qa-services.mjs [outDir] [--only=name-fragment] [--base=http://localhost:4321] [--step=0.6]
 * Needs the dev server (the ?tier= override only exists in dev). Same browser setup as qa-shots (qa-browser.mjs).
 * Keep outDir OUTSIDE the repo. For every run: one shot per `step` viewport heights down the whole page, then (with
 * JS) the same way back up (every scene is scrubbed and must reverse), then each tab (click → Flip → the area), the
 * header's «خدماتنا» link with ?area=, and on desktop a hover over a card (its star lights) and over a star.
 */
import { launch } from './qa-browser.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const out = args.find((a) => !a.startsWith('--')) ?? 'qa-services';
const only = arg('only');
const base = arg('base', 'http://localhost:4321');
const step = Number(arg('step', 0.6));
const page_ = 'services/';
mkdirSync(out, { recursive: true });

const desktop = { width: 1440, height: 900 }, phone = { width: 390, height: 844 }, small = { width: 360, height: 740 };
const runs = [
  { name: 'ar-desktop-full', path: `/${page_}?tier=full`, viewport: desktop },
  { name: 'en-desktop-full', path: `/en/${page_}?tier=full`, viewport: desktop },
  { name: 'ar-phone-full', path: `/${page_}?tier=full`, viewport: phone, mobile: true },
  { name: 'en-phone-full', path: `/en/${page_}?tier=full`, viewport: phone, mobile: true },
  { name: 'ar-small-full', path: `/${page_}?tier=full`, viewport: small, mobile: true },
  { name: 'ar-small-css', path: `/${page_}?tier=css`, viewport: small, mobile: true },
  { name: 'en-desktop-css', path: `/en/${page_}?tier=css`, viewport: desktop },
  { name: 'ar-desktop-reduced', path: `/${page_}`, viewport: desktop, reduce: true },
  { name: 'en-phone-reduced', path: `/en/${page_}`, viewport: phone, mobile: true, reduce: true },
  { name: 'ar-desktop-nojs', path: `/${page_}`, viewport: desktop, nojs: true },
  { name: 'en-phone-nojs', path: `/en/${page_}`, viewport: phone, mobile: true, nojs: true },
].filter((r) => !only || only.split(',').some((o) => r.name.includes(o)));

const browser = await launch();
const problems = [];

for (const run of runs) {
  const context = await browser.newContext({
    viewport: run.viewport, deviceScaleFactor: run.mobile ? 2 : 1, isMobile: !!run.mobile, hasTouch: !!run.mobile,
    reducedMotion: run.reduce ? 'reduce' : 'no-preference', javaScriptEnabled: !run.nojs,
  });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${run.name}: console ${m.type()} ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`${run.name}: pageerror ${e.message}`));
  page.on('requestfailed', (r) => { if (!/@vite|\.mp4|\.webm/.test(r.url())) problems.push(`${run.name}: failed ${r.url()} ${r.failure()?.errorText}`); });
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${run.name}: HTTP ${r.status()} ${r.url()}`); });
  const shot = (label) => page.screenshot({ path: join(out, `${run.name}-${label}.jpg`), type: 'jpeg', quality: 74 });
  const scrollTo = (top) => page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);

  await page.goto(base + run.path, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await shot('a0-entrance');
  await page.waitForTimeout(2600);
  await shot('a1-settled');
  if (!run.nojs) {
    if (run.mobile) await page.touchscreen.tap(200, 300);
    else { await page.mouse.move(300, 300); await page.mouse.move(340, 330); }                  // first interaction → the stage loads
    await page.waitForTimeout(4200);
    await shot('a2-stage');
    console.log(`${run.name}: tier ${await page.evaluate(() => document.documentElement.dataset.tier)} · canvas: ${await page.evaluate(() => !!document.querySelector('.stage-canvas.is-on'))}`);
  }
  const vh = run.viewport.height;
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const stops = [];
  for (let y = 0; y < height - vh * 0.3; y += vh * step) stops.push(Math.round(y));
  let n = 0;
  for (const y of stops) {
    await scrollTo(y);
    await page.waitForTimeout(run.nojs ? 250 : 1000);
    await shot(`s${String(n++).padStart(2, '0')}`);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) problems.push(`${run.name}: horizontal overflow ${overflow}px`);
  if (!run.nojs && !run.reduce) {
    n = 0;
    for (const y of stops.slice().reverse()) {
      await scrollTo(y);
      await page.waitForTimeout(900);
      await shot(`u${String(n++).padStart(2, '0')}`);
    }
  }
  if (!run.nojs) {
    // every tab: click → Flip → the area under the bar; the URL follows
    const top = await page.evaluate(() => document.querySelector('.dir').getBoundingClientRect().top + window.scrollY);
    await scrollTo(top + vh * 1.5);
    await page.waitForTimeout(900);
    for (const area of ['legal', 'travel', 'events', 'software', 'all']) {
      await page.click(`.tab[data-area="${area}"]`);
      await page.waitForTimeout(450);
      await shot(`t-${area}-a`);
      await page.waitForTimeout(1500);
      await shot(`t-${area}-b`);
      const state = await page.evaluate(() => ({
        url: location.search,
        shown: [...document.querySelectorAll('.area')].filter((a) => !a.hidden).map((a) => a.dataset.area).join(','),
        selected: document.querySelector('.tab[aria-selected="true"]')?.dataset.area,
      }));
      const want = area === 'all' ? 'legal,travel,events,software' : area;
      if (state.shown !== want || state.selected !== area || (area !== 'all' && !state.url.includes(`area=${area}`)) || (area === 'all' && state.url.includes('area='))) problems.push(`${run.name}: tab ${area} → ${JSON.stringify(state)}`);
    }
    // keyboard: arrows move the selection along the reading direction
    await page.focus('.tab[data-area="all"]');
    await page.keyboard.press(run.path.startsWith('/en/') ? 'ArrowRight' : 'ArrowLeft');
    await page.waitForTimeout(400);
    const kb = await page.evaluate(() => document.activeElement?.dataset.area);
    if (kb !== 'legal') problems.push(`${run.name}: arrow key → ${kb}`);
    await page.click('.tab[data-area="all"]');
    if (!run.mobile) {
      // a card under the pointer lights its star
      const card = await page.$('.svc[data-star="16"]');
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1600);
      const b = await card.boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
      await page.waitForTimeout(1200);
      await shot('h-card');
    }
    // the header submenu: ?area= opens the tab
    await page.goto(`${base}${run.path}${run.path.includes('?') ? '&' : '?'}area=events`, { waitUntil: 'load' });
    await page.waitForTimeout(2200);
    await shot('q-area-events');
    const q = await page.evaluate(() => [...document.querySelectorAll('.area')].filter((a) => !a.hidden).map((a) => a.dataset.area).join(','));
    if (q !== 'events') problems.push(`${run.name}: ?area=events → ${q}`);
  }
  await context.close();
}
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${[...new Set(problems)].join('\n')}` : 'no console errors or warnings, no failed requests, no horizontal overflow, tabs OK');
