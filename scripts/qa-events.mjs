/**
 * Visual QA of the Exhibitions & Conferences page: screenshots while scrolling down, then back up.
 *   node scripts/qa-events.mjs [outDir] [--only=name-fragment] [--base=http://localhost:4321] [--step=0.6]
 *   node scripts/qa-events.mjs [outDir] --at=hero:0,hero:0.5,expo:0.8 [--only=…]   shots at a section's sticky progress
 * Needs the dev server (the ?tier= override only exists in dev). Same browser setup as qa-shots (qa-browser.mjs).
 * For every run: one shot per `step` viewport heights down the whole page, then (with JS) the same way back up
 * (every scene is scrubbed and must reverse: the curtain closes again going up), then on desktop: a stand of the expo
 * under the pointer, and the badge grabbed and swung. Reports console errors, failed requests and horizontal overflow.
 */
import { launch } from './qa-browser.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const out = args.find((a) => !a.startsWith('--')) ?? 'qa-events';
const only = arg('only');
const base = arg('base', 'http://localhost:4321');
const step = Number(arg('step', 0.6));
const at = arg('at');
const path = 'services/exhibitions-conferences/';
mkdirSync(out, { recursive: true });

const desktop = { width: 1440, height: 900 }, phone = { width: 390, height: 844 }, small = { width: 360, height: 740 };
const runs = [
  { name: 'ar-desktop-full', path: `/${path}?tier=full`, viewport: desktop },
  { name: 'en-desktop-full', path: `/en/${path}?tier=full`, viewport: desktop },
  { name: 'ar-phone-full', path: `/${path}?tier=full`, viewport: phone, mobile: true },
  { name: 'en-phone-full', path: `/en/${path}?tier=full`, viewport: phone, mobile: true },
  { name: 'ar-small-css', path: `/${path}?tier=css`, viewport: small, mobile: true },
  { name: 'en-desktop-css', path: `/en/${path}?tier=css`, viewport: desktop },
  { name: 'ar-desktop-reduced', path: `/${path}`, viewport: desktop, reduce: true },
  { name: 'ar-desktop-nojs', path: `/${path}`, viewport: desktop, nojs: true },
  { name: 'en-phone-nojs', path: `/en/${path}`, viewport: phone, mobile: true, nojs: true },
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
  const scrollTo = async (y, wait) => { await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y); await page.waitForTimeout(wait); };

  await page.goto(base + run.path, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  if (!at) await shot('a0-entrance');
  await page.waitForTimeout(1800);
  if (!at) await shot('a1-settled');
  if (!run.nojs) {
    if (run.mobile) await page.touchscreen.tap(200, 300);
    else { await page.mouse.move(300, 300); await page.mouse.move(340, 330); }                  // first interaction → the stage loads
    await page.waitForTimeout(5000);
    if (!at) await shot('a2-stage');
    console.log(`${run.name}: tier ${await page.evaluate(() => document.documentElement.dataset.tier)} · canvas: ${await page.evaluate(() => !!document.querySelector('.gala__stage.is-drawing'))}`);
  }
  const vh = run.viewport.height;

  if (at) {                                                                                     // targeted shots
    for (const spec of at.split(',')) {
      const [id, p] = spec.split(':');
      const y = await page.evaluate(([sel, pr]) => {
        const el = sel === 'hero' ? document.querySelector('.ghero') : document.getElementById(sel);
        if (!el) return 0;
        const top = el.getBoundingClientRect().top + scrollY;
        return Math.max(0, top + (el.offsetHeight - innerHeight) * Number(pr));
      }, [id, p]);
      await scrollTo(Math.round(y), 1600);
      await shot(`at-${id}-${p}`);
    }
  } else {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const stops = [];
    for (let y = 0; y < height - vh * 0.3; y += vh * step) stops.push(Math.round(y));
    let n = 0;
    for (const y of stops) { await scrollTo(y, run.nojs ? 250 : 1100); await shot(`s${String(n++).padStart(2, '0')}`); }
    if (!run.nojs && !run.reduce) {
      n = 0;
      for (const y of stops.slice().reverse()) { await scrollTo(y, 900); if (n % 2 === 0) await shot(`u${String(n).padStart(2, '0')}`); n++; }
      if (!run.mobile && run.name.includes('full')) {
        // a stand under the pointer, then the badge grabbed and swung
        const expo = await page.evaluate(() => { const el = document.getElementById('expo'); return el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * 0.95; });
        await scrollTo(expo, 1800);
        await page.locator('.gexpo__pick').nth(2).hover(); await page.waitForTimeout(900); await shot('h0-legend-hover');
        await page.mouse.move(run.viewport.width * (run.name.startsWith('ar') ? 0.28 : 0.72), vh * 0.5, { steps: 6 }); await page.waitForTimeout(900); await shot('h1-stand-pointer');
        const reg = await page.evaluate(() => { const el = document.getElementById('register'); return el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * 0.5; });
        await scrollTo(reg, 2200);
        const box = await page.locator('.greg__pad').boundingBox();
        if (box) {
          const cx = box.x + box.width / 2, cy = box.y + box.height * 0.55;
          await page.mouse.move(cx, cy); await page.mouse.down();
          await page.mouse.move(cx - 220 * (run.name.startsWith('ar') ? -1 : 1), cy - 60, { steps: 12 });
          await shot('h2-badge-grabbed');
          await page.mouse.up(); await page.waitForTimeout(250); await shot('h3-badge-swing');
          await page.waitForTimeout(2500); await shot('h4-badge-settled');
        }
      }
    }
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) problems.push(`${run.name}: horizontal overflow ${overflow}px`);
  await context.close();
}
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${[...new Set(problems)].join('\n')}` : 'no console errors or warnings, no failed requests, no horizontal overflow');
