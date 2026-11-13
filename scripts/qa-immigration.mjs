/**
 * Visual QA of the Immigration page: screenshots while scrolling + while using the globe.
 *   node scripts/qa-immigration.mjs [outDir] [--only=name-fragment] [--base=http://localhost:4321] [--step=0.6]
 * Needs the dev server (the ?tier= override only exists in dev). Same browser setup as qa-shots (qa-browser.mjs).
 * For every run: one shot per `step` viewport heights down the whole page, then (unless JS is off) the globe:
 * click three countries on it, then pick one from the combobox with the keyboard.
 */
import { launch } from './qa-browser.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) ?? 'qa-immigration';
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const base = args.find((a) => a.startsWith('--base='))?.slice(7) ?? 'http://localhost:4321';
const step = Number(args.find((a) => a.startsWith('--step='))?.slice(7) ?? 0.6);
mkdirSync(out, { recursive: true });

const page_ = 'services/immigration-study-visa/';
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
].filter((r) => !only || r.name.includes(only));

const browser = await launch();
const problems = [];

for (const run of runs) {
  const context = await browser.newContext({
    viewport: run.viewport, deviceScaleFactor: run.mobile ? 2 : 1, isMobile: !!run.mobile, hasTouch: !!run.mobile,
    reducedMotion: run.reduce ? 'reduce' : 'no-preference', javaScriptEnabled: !run.nojs,
  });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${run.name}: console ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`${run.name}: pageerror ${e.message}`));
  page.on('requestfailed', (r) => { if (!/@vite|\.mp4|\.webm/.test(r.url())) problems.push(`${run.name}: failed ${r.url()} ${r.failure()?.errorText}`); });
  const shot = (label) => page.screenshot({ path: join(out, `${run.name}-${label}.jpg`), type: 'jpeg', quality: 72 });

  await page.goto(base + run.path, { waitUntil: 'load' });
  await page.waitForTimeout(2200);
  if (!run.nojs) { await page.mouse.move(300, 300); await page.mouse.move(340, 330); }        // first interaction → the stage may load
  const vh = run.viewport.height;
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  let n = 0;
  for (let y = 0; y < height - vh * 0.3; y += vh * step) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(run.nojs ? 250 : 900);
    await shot(`s${String(n++).padStart(2, '0')}`);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) problems.push(`${run.name}: horizontal overflow ${overflow}px`);

  if (!run.nojs) {
    // ---- the globe ----
    await page.evaluate(() => {
      const el = document.querySelector('#explore');
      window.scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: 'instant' });
    });
    await page.waitForTimeout(3500);
    const live = await page.evaluate(() => document.querySelector('#explore').classList.contains('is-live'));
    console.log(`${run.name}: tier ${await page.evaluate(() => document.documentElement.dataset.tier)} · globe live: ${live}`);
    await shot('g0-arrive');
    if (live) {
      const pad = page.locator('.explore__pad');
      const tap = async (fx, fy, label) => {
        await pad.scrollIntoViewIfNeeded();
        const b = await pad.boundingBox();
        const x = b.x + b.width * fx, y = b.y + b.height * fy;
        if (run.mobile) await page.touchscreen.tap(x, y); else { await page.mouse.move(x, y); await page.waitForTimeout(350); await shot(`${label}-hover`); await page.mouse.click(x, y); }
        await page.waitForTimeout(1500);
        await shot(`${label}-flying`);
        await page.waitForTimeout(3600);
        await shot(`${label}-landed`);
        console.log(`  ${label}: ${await page.evaluate(() => document.querySelector('.explore__country').textContent || '(nothing selected)')}`);
      };
      const centre = run.mobile ? 0.5 : (run.path.startsWith('/en') ? 0.635 : 0.365);
      await tap(centre + 0.05, run.mobile ? 0.56 : 0.55, 'g1');
      if (!run.mobile) {                                                    // drag to rotate, then click again
        const b = await pad.boundingBox();
        await page.mouse.move(b.x + b.width * centre, b.y + b.height * 0.5);
        await page.mouse.down();
        await page.mouse.move(b.x + b.width * (centre - 0.16), b.y + b.height * 0.56, { steps: 12 });
        await page.mouse.up();
        await page.waitForTimeout(1400);
        await shot('g2-dragged');
      }
      await tap(centre - 0.04, run.mobile ? 0.4 : 0.42, 'g3');
    }
    // ---- the combobox, by keyboard ----
    const input = page.locator('#explore-input');
    await input.scrollIntoViewIfNeeded();
    await input.focus();
    await page.keyboard.type(run.path.startsWith('/en') ? 'jap' : 'كند');
    await page.waitForTimeout(400);
    await shot('g4-combobox');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(live ? 5600 : 1200);
    await shot('g5-selected');
    console.log(`  combobox: ${await page.evaluate(() => document.querySelector('.explore__country').textContent)} · chip: ${await page.evaluate(() => document.querySelector('[data-destination-chip]').textContent)}`);
    await page.locator('.explore__ask').click();
    await page.waitForTimeout(2200);
    await shot('g6-consult');
  }
  await context.close();
}
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${[...new Set(problems)].join('\n')}` : 'no console errors, no failed requests, no horizontal overflow');
