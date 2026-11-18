/**
 * Events page — "the expo builds itself" (views/events/Expo.astro). Sticky + scrubbed, not a pin.
 * Its sticky progress draws the floor plan (bridge `gala.plan`) and raises the stands one by one (`gala.booths`);
 * the act `gala` does the 3D. Four stands stand for a service: hover / focus a legend row → `gala.booth` lights
 * that stand; the act reports the stand under the pointer (`gala.onHover`) → its legend row lights up.
 * css tier (no WebGL): the same progress fills the stands of the SVG plan; the legend lights its rect.
 * Set up only when the section comes near (motion/near.ts): nothing of it runs during page load.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { whenNear } from '../near';
import { GALA_BOOTHS, gala } from '../stage/bridge';

const clamp01 = gsap.utils.clamp(0, 1);
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

const scene: Scene = (root, env) => {
  whenNear(root, () => {
    const items = gsap.utils.toArray<HTMLElement>('.gexpo__item', root);
    const rects = gsap.utils.toArray<SVGRectElement>('.gexpo__booth', root);
    let dom = -1, canvas = -1;
    const paint = () => {
      const on = dom >= 0 ? dom : canvas;
      items.forEach((el, k) => el.classList.toggle('is-hot', k === on));
      rects.forEach((r) => r.classList.toggle('is-hot', r.dataset.hot === String(on)));
    };
    items.forEach((el, k) => {
      const pick = el.querySelector<HTMLAnchorElement>('.gexpo__pick')!;
      const on = () => { dom = k; gala.booth = k; paint(); };
      const off = () => { if (dom === k) { dom = -1; gala.booth = -1; paint(); } };
      el.addEventListener('pointerenter', on);
      el.addEventListener('pointerleave', off);
      pick.addEventListener('focus', on);
      pick.addEventListener('blur', off);
    });
    gala.onHover = (i) => { canvas = i; paint(); };

    const title = root.querySelector<HTMLElement>('.gexpo__title')!;
    const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
    gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 60%', once: true } })
      .fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.2, stagger: 0.08 })
      .fromTo(items, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.07 }, 0.3);

    // the 2D plan (css tier): the aisle and the outlines draw, then the stands fill in the same order as the 3D ones
    const order = rects.slice().sort((a, b) => Number(b.getAttribute('y')) - Number(a.getAttribute('y')) || Math.abs(Number(a.getAttribute('x')) - 47) - Math.abs(Number(b.getAttribute('x')) - 47));
    if (env.tier === 'css') {
      gsap.set(rects, { drawSVG: '0%', fillOpacity: 0 });
      gsap.set(root.querySelector('.gexpo__aisle'), { drawSVG: '0%' });
    }
    // (the SVG plan is drawn only on the css tier: no SVG measuring on every scroll when WebGL draws the floor)
    const plan = env.tier === 'css'
      ? gsap.timeline({ paused: true }).fromTo(root.querySelector('.gexpo__aisle'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.25, ease: 'none' }, 0).set({}, {}, 1)
      : undefined;
    ScrollTrigger.create({
      trigger: root, start: 'top top', end: 'bottom bottom', scrub: plan ? 0.4 : false, animation: plan,
      onUpdate: (self) => {
        const p = self.progress;
        gala.plan = span(p, 0.02, 0.3);
        gala.booths = span(p, 0.22, 0.86) * GALA_BOOTHS;
        if (plan) order.forEach((r, k) => gsap.set(r, { drawSVG: `${span(p * 20 - k * 0.6, 0, 2.2) * 100}%`, fillOpacity: span(gala.booths - k, 0, 1) }));
      },
    });
  });
};
export default scene;
