/**
 * Quality-policy QA (CLAUDE.md "Quality policy"): every visitor gets the full experience. Runs the production
 * preview under the worst conditions we have seen in the wild, all at once:
 *   - OS "reduce motion" ON (prefers-reduced-motion: reduce)
 *   - navigator.connection.saveData = true, 2 CPU cores, 1 GB memory reported
 *   - requestAnimationFrame capped at 30 fps (what Chrome Energy Saver does on battery)
 *   - DevTools CPU throttling 4×
 * and checks on every page × language × viewport: tier "full", the WebGL canvas drew, Lenis on, the scroll
 * scenes ran (.is-scrub / split words), no console errors. Reports the render-scale range it saw.
 *   npm run build && npm run preview -- --port 4322
 *   node scripts/qa-policy.mjs [--base=http://localhost:4322] [--only=fragment] [--cpu=4] [--fps=30]
 */
import { launch } from './qa-browser.mjs';

const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith('--base='))?.slice(7) ?? 'http://localhost:4322';
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const cpu = Number(args.find((a) => a.startsWith('--cpu='))?.slice(6) ?? 4);
const fps = Number(args.find((a) => a.startsWith('--fps='))?.slice(6) ?? 30);

const pages = [
  ['home', ''],
  ['immigration', 'services/immigration-study-visa/'],
  ['software', 'services/software-technology/'],
  ['legal', 'services/legal-services/'],
  ['events', 'services/exhibitions-conferences/'],
];
const devices = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];

const runs = [];
for (const [page, path] of pages) for (const lang of ['ar', 'en']) for (const device of devices) {
  const name = `${page}-${lang}-${device.name}`;
  if (!only || name.includes(only)) runs.push({ name, url: `${base}/${lang === 'en' ? 'en/' : ''}${path}`, device });
}

const browser = await launch();
const failures = [];

for (const { name, url, device } of runs) {
  const { name: _, ...options } = device;
  const context = await browser.newContext({ ...options, reducedMotion: 'reduce' });
  await context.addInitScript(({ fps }) => {
    try { sessionStorage.setItem('waysz-intro', '1'); } catch {}
    // weak-device signals the old tier logic reacted to — they must change nothing now
    const def = (o, k, v) => { try { Object.defineProperty(o, k, { get: () => v, configurable: true }); } catch {} };
    if (navigator.connection) def(navigator.connection, 'saveData', true);
    def(navigator, 'hardwareConcurrency', 2);
    def(navigator, 'deviceMemory', 1);
    // 30 fps cap: rAF callbacks run at most every 1000/fps ms (like Energy Saver); real frame gaps are recorded
    const raf = window.requestAnimationFrame.bind(window);
    const caf = window.cancelAnimationFrame.bind(window);
    const step = 1000 / fps - 2;
    let queue = new Map(), next = 1, pending = 0, lastRun = 0;
    window.__gaps = [];
    const pump = (t) => {
      pending = 0;
      if (t - lastRun < step) { pending = raf(pump); return; }
      if (lastRun) window.__gaps.push(t - lastRun);
      lastRun = t;
      const q = queue; queue = new Map();
      q.forEach((cb) => { try { cb(t); } catch (e) { setTimeout(() => { throw e; }); } });
    };
    window.requestAnimationFrame = (cb) => {
      const id = next++;
      queue.set(id, cb);
      if (!pending) pending = raf(pump);
      return id;
    };
    window.cancelAnimationFrame = (id) => { queue.delete(id); if (!queue.size && pending) { caf(pending); pending = 0; } };
  }, { fps });

  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  // first interaction (the stage waits for it)
  if (device.isMobile) await page.evaluate(() => window.dispatchEvent(new Event('touchstart')));
  else { await page.mouse.move(300, 300); await page.mouse.move(360, 340); }
  await page.waitForTimeout(4000);

  const ratios = new Set();
  let drew = false, last = null;
  const sample = async () => {
    const s = await page.evaluate(() => {
      const c = document.querySelector('.stage-canvas');
      return { on: !!c?.classList.contains('is-on'), ratio: c?.dataset.ratio ?? null };
    });
    if (s.on) drew = true;
    if (s.ratio) { ratios.add(Number(s.ratio)); last = Number(s.ratio); }
  };
  await sample();
  await page.evaluate(() => { window.__gaps = []; });
  const end = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const stride = device.isMobile ? 90 : 120;
  for (let y = 0, i = 0; y < end; y += stride, i++) {
    if (device.isMobile) await page.evaluate((top) => window.scrollTo(0, top), y + stride);
    else await page.mouse.wheel(0, stride);
    await page.waitForTimeout(60);
    if (i % 6 === 0) await sample();
  }
  await page.waitForTimeout(1500);
  await sample();

  const state = await page.evaluate(() => {
    const html = document.documentElement;
    const gaps = window.__gaps.slice().sort((a, b) => a - b);
    const at = (p) => gaps[Math.floor(gaps.length * p)] ?? 0;
    return {
      tier: html.dataset.tier,
      js: html.classList.contains('js'),
      ready: html.classList.contains('motion-ready'),
      lenis: html.classList.contains('lenis'),
      cursor: html.classList.contains('has-cursor'),
      reduceQuery: matchMedia('(prefers-reduced-motion: reduce)').matches,
      saveData: navigator.connection?.saveData ?? null,
      scrub: document.querySelectorAll('.is-scrub').length,
      split: document.querySelectorAll('[data-split] div, .w, .hero__word').length,
      videos: [...document.querySelectorAll('video[data-bgvideo]')].filter((v) => v.currentSrc).length,
      frames: gaps.length, median: at(0.5), p95: at(0.95),
    };
  });
  await context.close();

  const problems = [];
  if (!state.reduceQuery) problems.push('emulation: reduce-motion query not on');
  if (state.tier !== 'full') problems.push(`tier ${state.tier}`);
  if (!state.js || !state.ready) problems.push(`motion not ready (js ${state.js}, ready ${state.ready})`);
  if (!state.lenis) problems.push('Lenis off');
  if (!drew) problems.push('WebGL canvas never drew');
  if (!state.scrub && !state.split) problems.push('no scroll scene ran');
  if (!device.isMobile && !state.cursor) problems.push('plane cursor off');
  errors.forEach((e) => problems.push(`console: ${e}`));
  const r = [...ratios].sort((a, b) => a - b);
  console.log(`${problems.length ? '✗' : '✓'} ${name.padEnd(26)} tier ${state.tier} · canvas ${drew ? 'drew' : 'NO'} · ratio ${
    r.length ? `${r[0]}–${r.at(-1)} (end ${last})` : '-'} · lenis ${state.lenis} · scrub ${state.scrub} · split ${state.split} · videos ${state.videos} · ${
    fps} fps cap: median ${state.median.toFixed(1)}ms p95 ${state.p95.toFixed(1)}ms (saveData ${state.saveData})`);
  problems.forEach((p) => console.log(`    ${p}`));
  if (problems.length) failures.push(name);
}
await browser.close();
console.log(failures.length ? `\n${failures.length} run(s) failed: ${failures.join(', ')}` : `\nall ${runs.length} runs: full experience`);
process.exit(failures.length ? 1 : 0);
