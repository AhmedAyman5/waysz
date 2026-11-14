/**
 * Visual QA of the Software & Technology page: screenshots while scrolling down, then back up.
 *   node scripts/qa-software.mjs [outDir] [--only=name-fragment] [--base=http://localhost:4321] [--step=0.6] [--page=services/software-technology/]
 * Needs the dev server (the ?tier= override only exists in dev). Same browser setup as qa-shots (qa-browser.mjs).
 * For every run: one shot per `step` viewport heights down the whole page, then (with JS) the same way back up
 * (every scene is scrubbed and must reverse), then the pointer field of the hero on desktop.
 */
import { launch } from './qa-browser.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const out = args.find((a) => !a.startsWith('--')) ?? 'qa-software';
const only = arg('only');
const base = arg('base', 'http://localhost:4321');
const step = Number(arg('step', 0.6));
const page_ = arg('page', 'services/software-technology/');
mkdirSync(out, { recursive: true });

const desktop = { width: 1440, height: 900 }, phone = { width: 390, height: 844 }, small = { width: 360, height: 740 };
const runs = [
  { name: 'ar-desktop-high', path: `/${page_}?tier=high`, viewport: desktop },
  { name: 'en-desktop-high', path: `/en/${page_}?tier=high`, viewport: desktop },
  { name: 'ar-phone-lite', path: `/${page_}?tier=lite`, viewport: phone, mobile: true },
  { name: 'en-phone-lite', path: `/en/${page_}?tier=lite`, viewport: phone, mobile: true },
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
  const shot = (label) => page.screenshot({ path: join(out, `${run.name}-${label}.jpg`), type: 'jpeg', quality: 74 });

  await page.goto(base + run.path, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await shot('a0-entrance');                                                                    // mid-entrance
  await page.waitForTimeout(2600);
  await shot('a1-settled');
  if (!run.nojs) {
    if (run.mobile) await page.touchscreen.tap(200, 300);
    else { await page.mouse.move(300, 300); await page.mouse.move(340, 330); }                  // first interaction → the stage may load
    await page.waitForTimeout(3800);
    await shot('a2-stage');
    if (!run.mobile) {                                                                          // the pointer field over the code
      const b = await page.locator('.chero__codebox .code').boundingBox();
      if (b) {
        await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.4, { steps: 8 });
        await page.waitForTimeout(700);
        await shot('a3-field');
        await page.mouse.move(40, 500, { steps: 4 });
      }
    }
    console.log(`${run.name}: tier ${await page.evaluate(() => document.documentElement.dataset.tier)} · canvas: ${await page.evaluate(() => !!document.querySelector('.stage-canvas.is-on'))}`);
  }
  const vh = run.viewport.height;
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const stops = [];
  for (let y = 0; y < height - vh * 0.3; y += vh * step) stops.push(Math.round(y));
  let n = 0;
  for (const y of stops) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(run.nojs ? 250 : 900);
    await shot(`s${String(n++).padStart(2, '0')}`);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) problems.push(`${run.name}: horizontal overflow ${overflow}px`);
  if (!run.nojs && !run.reduce) {
    n = 0;
    for (const y of stops.slice().reverse()) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForTimeout(900);
      await shot(`u${String(n++).padStart(2, '0')}`);
    }
  }
  await context.close();
}
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${[...new Set(problems)].join('\n')}` : 'no console errors or warnings, no failed requests, no horizontal overflow');
