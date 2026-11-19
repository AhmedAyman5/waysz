/**
 * Services page — the thread (views/ServicesPage.astro). Lives on the page's ONE stage host, which CSS keeps on screen
 * for the whole page. It only measures and writes the bridge (acts/sky.ts reads it):
 *   focus + box   the area under the middle of the screen and its `.area__sky` window (the act flies there and frames
 *                 that constellation inside it); the finale frames the whole sky in `.unite__sky`; elsewhere the
 *                 whole sky fills the screen
 *   night         twilight at the top of the page, deep night from the directory on
 *   pointer       where the mouse is over open sky (`[data-sky-pad]`, not over text or links): the act finds the
 *                 star under it; the scene shows that service's name beside it and a click brings its card
 *                 (services-directory.ts listens for `sky:pick`)
 * Everything is a function of the scroll position, so it all reverses. On desktop the plane cursor leaves a short
 * trail of stars (this page only). css tier (no WebGL): it swaps the stills (scattered → assembled) and loads the
 * area stills. Positions on screen come from the DOM, so RTL needs nothing here: the constellations never mirror.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Scene } from '../index';
import { sky, SKY_AREAS } from '../stage/bridge';
import { addAct } from '../stage';

const clamp01 = gsap.utils.clamp(0, 1);
const TRAIL = 9;

const scene: Scene = (host, env) => {
  const root = host.closest<HTMLElement>('.sky')!;
  const areas = SKY_AREAS.map((a) => root.querySelector<HTMLElement>(`.area[data-area="${a}"]`)!);
  const pads = areas.map((a) => a.querySelector<HTMLElement>('.area__sky')!);
  const dir = root.querySelector<HTMLElement>('.dir')!;
  const unite = root.querySelector<HTMLElement>('.unite');
  const unitePad = unite?.querySelector<HTMLElement>('.unite__sky');
  const tip = host.querySelector<HTMLElement>('.sky__tip')!;

  const portrait = matchMedia('(orientation: portrait)');
  const setCompact = () => { sky.compact = portrait.matches; };
  setCompact();
  portrait.addEventListener('change', setCompact);

  // ---------- dev: the stills of the css tier (scripts/render-sky-still.mjs) ----------
  if (import.meta.env.DEV) {
    const still = new URLSearchParams(location.search).get('sky') as typeof sky.poster | null;
    if (still && (['scatter', 'all', ...SKY_AREAS] as string[]).includes(still)) {
      sky.poster = still;
      root.classList.add('is-poster');
      const vw = host.clientWidth, vh = host.clientHeight;
      const i = (SKY_AREAS as readonly string[]).indexOf(still);
      sky.focus = i;
      if (i >= 0) { const s = Math.min(vw, vh) * 0.86; Object.assign(sky.box, { x: (vw - s) / 2, y: (vh - s) / 2, w: s, h: s }); }
      else Object.assign(sky.box, { x: 0, y: 60, w: vw, h: vh - 60 });
      void addAct(env, async () => (await import('../stage/acts/sky')).createSkyAct(host));
      return;
    }
  }

  // ---------- scroll → focus, box, night ----------
  let dirTop = 1, settled = false, assembled = false;
  const css = () => document.documentElement.dataset.tier === 'css';
  const update = () => {
    const vw = host.clientWidth, vh = window.innerHeight, mid = vh * 0.5;
    let focus = -1;
    let pad: HTMLElement | null = null;
    const u = unite?.getBoundingClientRect();
    if (u && u.top <= mid && u.bottom > mid) pad = unitePad ?? null;
    else areas.forEach((a, i) => {
      if (a.hidden) return;
      const r = a.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) { focus = i; pad = pads[i]; }
    });
    if (pad) {
      const r = (pad as HTMLElement).getBoundingClientRect();   // the constellation follows its window (lagging a little: depth)
      Object.assign(sky.box, { x: r.left, y: r.top, w: r.width, h: r.height });
    } else Object.assign(sky.box, { x: 0, y: 60, w: vw, h: vh - 60 });
    sky.focus = focus;
    sky.night = clamp01(window.scrollY / dirTop);
    // css tier: the still of the four constellations only behind the hero and the finale (the areas show their own);
    // DOM write only when it changes (this also runs inside ScrollTrigger.refresh)
    const all = css() && settled && (pad === unitePad && !!pad || (focus < 0 && window.scrollY < dirTop - vh * 0.5));
    if (all !== assembled) { assembled = all; host.classList.toggle('is-assembled', all); }
  };
  ScrollTrigger.create({
    trigger: root, start: 'top bottom', end: 'bottom top',
    onUpdate: update,
    onRefresh: () => { dirTop = Math.max(dir.getBoundingClientRect().top + window.scrollY, 1); update(); },
  });
  window.addEventListener('services:tab', () => requestAnimationFrame(update));

  // ---------- the pointer over open sky: hover a star, click it ----------
  const isOpen = (t: EventTarget | null) =>
    t instanceof Element && !!t.closest('[data-sky-pad]') && !t.closest('a, button, input, h1, h2, h3, p, li, .shero__content');
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = host.getBoundingClientRect();
    sky.pointer.on = isOpen(e.target);
    sky.pointer.x = e.clientX - r.left;
    sky.pointer.y = e.clientY - r.top;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { sky.pointer.on = false; });
  const cursor = document.querySelector<HTMLElement>('.cursor');
  sky.onHover = (i) => {
    const name = i >= 0 ? root.querySelector(`.svc[data-star="${i}"] .svc__name`)?.textContent ?? '' : '';
    if (name) {
      tip.textContent = name;
      gsap.set(tip, { x: sky.hoverAt.x, y: sky.hoverAt.y });
    }
    tip.classList.toggle('is-on', !!name);
    cursor?.classList.toggle('is-hot', !!name);
    window.dispatchEvent(new CustomEvent('sky:hover', { detail: i }));
  };
  document.addEventListener('click', (e) => {
    if (sky.hover < 0 || !isOpen(e.target)) return;
    window.dispatchEvent(new CustomEvent('sky:pick', { detail: sky.hover }));
  });

  // ---------- a short trail of stars behind the plane cursor (desktop, this page only) ----------
  if (env.desktop) {
    const trail = document.createElement('div');
    trail.className = 'star-trail';
    trail.setAttribute('aria-hidden', 'true');
    const dots = Array.from({ length: TRAIL }, (_, i) => {
      const dot = document.createElement('i');
      gsap.set(dot, { scale: 1 - i / (TRAIL + 2), opacity: 0.9 - i * 0.08 });
      trail.append(dot);
      return { x: gsap.quickTo(dot, 'x', { duration: 0.16 + i * 0.07, ease: 'power3.out' }), y: gsap.quickTo(dot, 'y', { duration: 0.16 + i * 0.07, ease: 'power3.out' }), dot };
    });
    document.body.append(trail);
    let idle: gsap.core.Tween | null = null, seen = false;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!seen) { seen = true; dots.forEach((d) => gsap.set(d.dot, { x: e.clientX, y: e.clientY })); }
      dots.forEach((d) => { d.x(e.clientX); d.y(e.clientY); });
      trail.classList.add('is-on');
      idle?.kill();
      idle = gsap.delayedCall(0.35, () => trail.classList.remove('is-on'));
    }, { passive: true });
  }

  // ---------- css tier: the stills (also when the WebGL context is lost later) ----------
  const stills = () => {
    host.querySelectorAll<HTMLElement>('[data-srcset], [data-src]').forEach((el) => {
      if (el.dataset.srcset) el.setAttribute('srcset', el.dataset.srcset);
      if (el.dataset.src) el.setAttribute('src', el.dataset.src);
    });
    root.querySelectorAll<HTMLImageElement>('.area__still[data-src]').forEach((img) => { img.src = img.dataset.src!; });
    gsap.delayedCall(1.2, () => { settled = true; update(); });   // the stars "gather": scattered → assembled
  };
  if (env.tier === 'css') { stills(); return; }
  new MutationObserver((_, mo) => { if (document.documentElement.dataset.tier === 'css') { mo.disconnect(); stills(); } })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-tier'] });
  void addAct(env, async () => (await import('../stage/acts/sky')).createSkyAct(host));
};
export default scene;
