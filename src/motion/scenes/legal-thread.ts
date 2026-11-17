/**
 * Legal page — the thread (views/LegalPage.astro). Lives on the page's ONE stage host, which CSS keeps on screen
 * for the whole page. This scene only measures: which section the middle of the screen is in and how far through
 * it (bridge.justice.shot → the camera of acts/justice.ts), the dip of light at the cut into the colonnade
 * (veil), and whether the consult section has arrived (final → the last weight → perfect balance).
 * Everything is a pure function of the scroll position, so scrolling back unbalances the scales again.
 * css tier / reduced motion: nothing to do — the sections show the still of the balanced scales.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Scene } from '../index';
import { justice } from '../stage/bridge';
import { addAct } from '../stage';

const clamp01 = gsap.utils.clamp(0, 1);
const CUT = 2;                                               // index of the colonnade section: the camera cuts into it

const scene: Scene = (host, env) => {
  const root = host.closest<HTMLElement>('.legal')!;
  const sections = gsap.utils.toArray<HTMLElement>('[data-shot]', root);
  justice.side = env.dir;
  justice.icons = gsap.utils.toArray<SVGPathElement>('[data-engrave]', root).map((p) => p.getAttribute('d') ?? '');
  if (env.reduce || env.tier === 'css') return;

  let tops: number[] = [], heights: number[] = [];
  const measure = () => {
    const y = window.scrollY;
    tops = sections.map((s) => s.getBoundingClientRect().top + y);
    heights = sections.map((s) => Math.max(s.offsetHeight, 1));
  };
  const update = () => {
    if (!tops.length) measure();
    const vh = window.innerHeight, y = window.scrollY;
    const line = y + Math.min(y, vh * 0.5);                  // the top of the page, then the middle of the screen
    let i = 0;
    tops.forEach((top, k) => { if (line >= top) i = k; });
    const local = clamp01((line - tops[i]) / heights[i]);
    justice.shot = i + Math.min(local, 0.999);
    justice.veil = clamp01(1 - Math.abs(line - tops[CUT]) / (vh * 0.4));
    justice.final = i === sections.length - 1 && line - tops[i] > vh * 0.16;
  };
  gsap.matchMedia().add({ wide: '(min-width: 1024px)', small: '(max-width: 1023px)' }, (ctx) => {
    justice.compact = !ctx.conditions!.wide;
  });
  ScrollTrigger.create({
    trigger: root, start: 'top bottom', end: 'bottom top',
    onUpdate: update, onRefresh: () => { measure(); update(); },
  });

  if (import.meta.env.DEV && new URLSearchParams(location.search).get('scales') === 'poster') {
    root.classList.add('is-poster');                         // see scripts/render-scales-still.mjs
    justice.poster = true;
  }
  void addAct(env, async () => (await import('../stage/acts/justice')).createJusticeAct(host, env.tier === 'high' ? 'high' : 'lite'));
};
export default scene;
