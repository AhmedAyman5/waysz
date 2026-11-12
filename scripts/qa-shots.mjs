/**
 * Visual QA: screenshots of a page while scrolling, for every language / viewport / tier.
 *   node scripts/qa-shots.mjs [outDir] [--only=name-fragment] [--base=http://localhost:4321]
 * Needs the dev server (npm run dev) — the ?tier= override only exists in dev.
 * Uses the installed Google Chrome (channel "chrome") with the real GPU so WebGL tiers render.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) ?? 'qa-shots';
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const base = args.find((a) => a.startsWith('--base='))?.slice(7) ?? 'http://localhost:4321';
mkdirSync(out, { recursive: true });

const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };
const small = { width: 360, height: 740 };
// scroll positions in viewport heights
const stops = [0, 0.3, 0.6, 0.85, 1.0, 1.4, 2.0, 2.7, 3.3, 3.75, 3.95, 4.6];
const mobileStops = [0, 0.3, 0.6, 0.85, 1.0, 1.3, 1.7, 2.1, 2.5, 2.65, 2.8, 3.4];

const runs = [
  { name: 'ar-desktop-high', path: '/?tier=high', viewport: desktop },
  { name: 'en-desktop-high', path: '/en/?tier=high', viewport: desktop },
  { name: 'ar-phone-lite', path: '/?tier=lite', viewport: phone, mobile: true },
  { name: 'en-phone-lite', path: '/en/?tier=lite', viewport: phone, mobile: true },
  { name: 'ar-phone-css', path: '/?tier=css', viewport: phone, mobile: true },
  { name: 'ar-desktop-css', path: '/?tier=css', viewport: desktop },
  { name: 'ar-small-css', path: '/?tier=css', viewport: small, mobile: true },
  { name: 'ar-desktop-reduced', path: '/', viewport: desktop, reduce: true, stops: [0, 1, 2] },
  { name: 'ar-phone-reduced', path: '/', viewport: phone, mobile: true, reduce: true, stops: [0, 1, 2] },
  { name: 'ar-desktop-nojs', path: '/', viewport: desktop, nojs: true, stops: [0, 1, 2] },
  { name: 'ar-desktop-intro', path: '/?tier=high', viewport: desktop, intro: true, stops: [0] },
].filter((r) => !only || r.name.includes(only));

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const problems = [];

for (const run of runs) {
  const context = await browser.newContext({
    viewport: run.viewport,
    deviceScaleFactor: run.mobile ? 2 : 1,
    isMobile: !!run.mobile,
    hasTouch: !!run.mobile,
    reducedMotion: run.reduce ? 'reduce' : 'no-preference',
    javaScriptEnabled: !run.nojs,
  });
  if (!run.intro) await context.addInitScript(() => { try { sessionStorage.setItem('waysz-intro', '1'); } catch {} });
  const page = await context.newPage();
  const shots = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${run.name}: console ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`${run.name}: pageerror ${e.message}`));
  page.on('requestfailed', (r) => { if (!r.url().includes('/@vite')) problems.push(`${run.name}: failed ${r.url()} ${r.failure()?.errorText}`); });

  await page.goto(base + run.path, { waitUntil: 'load' });
  if (run.intro) {
    for (const ms of [600, 1600, 2600, 4200]) {
      await page.waitForTimeout(ms === 600 ? 600 : 1000 + (ms === 4200 ? 600 : 0));
      shots.push(join(out, `${run.name}-t${ms}.jpg`));
      await page.screenshot({ path: shots.at(-1), type: 'jpeg', quality: 80 });
    }
  } else {
    await page.waitForTimeout(run.nojs ? 500 : 3800);
    const list = run.stops ?? (run.mobile ? mobileStops : stops);
    for (const [i, vh] of list.entries()) {
      if (!run.nojs) {
        await page.evaluate((y) => window.scrollTo({ top: y * window.innerHeight, behavior: 'instant' }), vh);
        await page.waitForTimeout(1300);
      } else {
        await page.mouse.wheel(0, i === 0 ? 0 : run.viewport.height);
        await page.waitForTimeout(300);
      }
      shots.push(join(out, `${run.name}-${String(i).padStart(2, '0')}-${vh}vh.jpg`));
      await page.screenshot({ path: shots.at(-1), type: 'jpeg', quality: 80 });
    }
    if (!run.nojs) {
      const info = await page.evaluate(() => ({
        tier: document.documentElement.dataset.tier,
        live: !!document.querySelector('[data-flight].is-live'),
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
      }));
      console.log(run.name, JSON.stringify(info));
      if (info.overflowX > 0) problems.push(`${run.name}: horizontal overflow ${info.overflowX}px`);
    }
  }
  await context.close();

  // contact sheet of this run (one image to review)
  const cols = run.mobile ? 6 : 4;
  const cell = run.mobile ? 300 : 480;
  const sheet = await browser.newPage({ viewport: { width: cols * cell, height: 100 } });
  const html = join(out, `sheet-${run.name}.html`);
  writeFileSync(html, `<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(${cols},${cell}px)">${
    shots.map((f) => `<img src="${basename(f)}" style="width:100%;display:block">`).join('')}</body>`);
  await sheet.goto(pathToFileURL(resolve(html)).href);
  await sheet.waitForLoadState('networkidle');
  await sheet.screenshot({ path: join(out, `sheet-${run.name}.jpg`), type: 'jpeg', quality: 82, fullPage: true });
  await sheet.close();
}
await browser.close();
console.log(problems.length ? `PROBLEMS\n${problems.join('\n')}` : 'no console errors, no failed requests');
