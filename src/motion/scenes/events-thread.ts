/**
 * Events page — the thread (views/EventsPage.astro). Lives on the page's ONE stage host, which CSS keeps on screen
 * for the whole page. This scene only measures the scroll and writes the bridge (acts/gala.ts reads it):
 *   shot     which section the middle of the screen is in and how far (→ the camera)
 *   open     the curtain, drawn open by the hero's own sticky progress
 *   carpet   how far the red carpet has unrolled: it runs ahead of the visitor from the services to the seats
 *   flashes  press flashes while the hall is revealed · led  the LED wall comes on with the hall
 *   veil     the dip into the dark that hides each camera cut (hero → foyer, foyer → stage)
 * Everything is a pure function of the scroll position, so it all reverses. The section scenes write their own
 * moments (expo, badge, interpretation, types, beams, finale) from their own sticky progress.
 * css tier (no WebGL): it swaps the two stills (closed curtain at both ends, the hall in between).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Scene } from '../index';
import { gala } from '../stage/bridge';
import { addAct } from '../stage';

const clamp01 = gsap.utils.clamp(0, 1);
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (t: number) => t * t * (3 - 2 * t);
const CUTS = [1, 5];                                          // sections the camera cuts into: services, interpretation

const scene: Scene = (host, env) => {
  const root = host.closest<HTMLElement>('.gala')!;
  const sections = gsap.utils.toArray<HTMLElement>('[data-shot]', root);
  const last = sections.length - 1;
  gala.side = env.dir;
  gala.lang = host.dataset.lang === 'en' ? 'en' : 'ar';
  gala.icons = gsap.utils.toArray<SVGPathElement>('#types [data-engrave]', root).map((p) => p.getAttribute('d') ?? '');

  let tops: number[] = [], heights: number[] = [];
  const measure = () => {
    const y = window.scrollY;
    tops = sections.map((s) => s.getBoundingClientRect().top + y);
    heights = sections.map((s) => Math.max(s.offsetHeight, 1));
  };
  const sticky = (k: number, y: number, vh: number) => clamp01((y - tops[k]) / Math.max(heights[k] - vh, 1));

  const update = () => {
    if (!tops.length) measure();
    const vh = window.innerHeight, y = window.scrollY;
    const line = y + Math.min(y, vh * 0.5);                  // the top of the page, then the middle of the screen
    let i = 0;
    tops.forEach((top, k) => { if (line >= top) i = k; });
    const local = clamp01((line - tops[i]) / heights[i]);
    gala.shot = i + Math.min(local, 0.999);

    const hero = sticky(0, y, vh);
    gala.open = smooth(span(hero, 0.03, 0.4));
    gala.flashes = i === 0 ? span(hero, 0.22, 0.42) * (1 - span(hero, 0.88, 1)) : 0;
    gala.led = i === 0 ? span(hero, 0.2, 0.5) : 1;
    // the carpet unrolls ahead of the walk: services → expo → arrivals → through the doors and down the aisle
    const s1 = sticky(1, y, vh), s3 = sticky(3, y, vh), s4 = sticky(4, y, vh);
    gala.carpet = i < 1 ? 0 : i === 1 ? 0.3 * s1 : i === 2 ? 0.3 + 0.08 * local : i === 3 ? 0.38 + 0.27 * s3 : i === 4 ? 0.65 + 0.35 * span(s4, 0, 0.5) : 1;
    gala.veil = Math.max(...CUTS.map((c) => clamp01(1 - Math.abs(line - tops[c]) / (vh * 0.32))));
    host.classList.toggle('is-hall', (i > 0 || hero > 0.35) && i < last);
  };
  gsap.matchMedia().add({ wide: '(min-width: 1024px)', small: '(max-width: 1023px)' }, (ctx) => {
    gala.compact = !ctx.conditions!.wide;
  });
  ScrollTrigger.create({
    trigger: root, start: 'top bottom', end: 'bottom top',
    onUpdate: update, onRefresh: () => { measure(); update(); },
  });

  if (import.meta.env.DEV) {
    const still = new URLSearchParams(location.search).get('gala');
    if (still === 'curtain' || still === 'hall') { root.classList.add('is-poster'); gala.poster = still; }   // scripts/render-gala-still.mjs
  }
  if (env.tier === 'css') return;
  void addAct(env, async () => (await import('../stage/acts/gala')).createGalaAct(host));
};
export default scene;
