/**
 * Legal page — the six services, "six weights" (views/legal/Services.astro).
 * CSS sticky holds the screen (not a pin); one ScrollTrigger gives every service its turn. A service that has had
 * its turn leaves its weight on the pan of the 3D scales (bridge.justice.count → acts/justice.ts), so the scales
 * settle step by step and tip back when you scroll up. The tray of six small weights is real buttons: hover or
 * focus drops that weight early (justice.focus), click scrolls to its service.
 * Each service also owns one paused timeline — its small drawn moment — driven only by scroll.
 * Hidden services are faded with opacity (never visibility); a focused link scrolls its service into place.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { justice } from '../stage/bridge';
import { lenis } from '../smooth-scroll';

const clamp01 = gsap.utils.clamp(0, 1);
const DROP = 0.2;                                            // how far into its turn a service drops its weight

function moment(card: HTMLElement, dir: 1 | -1) {
  const q = gsap.utils.selector(card);
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
  const draw = (sel: string, at: number, duration: number, stagger = 0) =>
    tl.fromTo(q(sel), { drawSVG: '0%' }, { drawSVG: '100%', duration, stagger, ease: 'power1.inOut' }, at);
  switch (card.dataset.fx) {
    case 'beam': {                                           // the light crosses the page in the reading direction
      const edge = dir === 1 ? [-330, 0] : [330, 0], beam = dir === 1 ? [-22, 308] : [318, -12];
      tl.fromTo(q('.fx-wipe'), { attr: { x: edge[0] } }, { attr: { x: edge[1] }, duration: 0.8, ease: 'none' }, 0.06)
        .fromTo(q('.fx-beam'), { x: beam[0] }, { x: beam[1], duration: 0.8, ease: 'none' }, 0.06)
        .fromTo(q('.fx-beam'), { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.06)
        .to(q('.fx-beam'), { opacity: 0, duration: 0.12 }, 0.8);
      break;
    }
    case 'gather':
      draw('.fx-folder', 0, 0.3);
      tl.fromTo(q('.fx-pocket'), { opacity: 0 }, { opacity: 1, duration: 0.15 }, 0.2);
      (q('.fx-sheet') as HTMLElement[]).forEach((el, i) => {
        const [x, y, r] = (el.dataset.from ?? '0,0,0').split(',').map(Number);
        tl.fromTo(el, { x: x * dir, y, rotation: r * dir, opacity: 0, transformOrigin: '50% 50%' }, { opacity: 1, duration: 0.08, ease: 'none' }, 0.04 + i * 0.05)
          .to(el, { x: 0, y: 0, rotation: 0, duration: 0.36, ease: 'power3.inOut' }, 0.22 + i * 0.09);
      });
      draw('.fx-tab', 0.84, 0.14);
      break;
    case 'warm':
      (q('.fx-orb') as HTMLElement[]).forEach((el, i) => {
        const [x, y] = (el.dataset.from ?? '0,0').split(',').map(Number);
        tl.fromTo(el, { x, y, scale: 0.55, opacity: 0.25, transformOrigin: '50% 50%' }, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.7, ease: 'power2.inOut' }, 0.04 + i * 0.08);
      });
      draw('.fx-roof', 0.4, 0.5);
      break;
    case 'sign':
      draw('.fx-line', 0.02, 0.16, 0.08);
      draw('.fx-sign', 0.48, 0.28);
      tl.fromTo(q('.fx-seal'), { scale: 2.8, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: 0.1, ease: 'power4.in' }, 0.78)
        .fromTo(q('.fx-shock'), { scale: 1, opacity: 0.9, transformOrigin: '50% 50%' }, { scale: 2.7, opacity: 0, duration: 0.14, ease: 'power2.out' }, 0.88);
      break;
    case 'status':
      draw('.fx-globe .fx-stroke', 0, 0.3, 0.05);
      tl.fromTo(q('.fx-card'), { x: 54 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power3.out' }, 0.42);
      draw('.fx-check', 0.76, 0.18);
      break;
    case 'merge':
      tl.fromTo(q('.fx-trail'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5, ease: 'power1.in' }, 0)
        .fromTo(q('.fx-spark'), { scale: 0.2, opacity: 0.9, transformOrigin: '50% 50%' }, { scale: 1.5, opacity: 0, duration: 0.2 }, 0.5);
      draw('.fx-one', 0.54, 0.34);
      tl.fromTo(q('.fx-end'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.1, ease: 'back.out(3)' }, 0.86);
      break;
  }
  tl.set({}, {}, 1);
  tl.progress(0);
  return tl;
}

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const services = gsap.utils.toArray<HTMLElement>('.lsvc', root);
  const ticks = gsap.utils.toArray<HTMLButtonElement>('.lsvc__tick', root);
  const texts = services.map((s) => s.querySelector<HTMLElement>('.lsvc__text')!);
  const boxes = services.map((s) => s.querySelector<HTMLElement>('.lsvc__fx')!);
  const n = services.length;
  root.classList.add('is-scrub');

  const title = root.querySelector<HTMLElement>('.lsvc__title')!;
  const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.1, stagger: 0.07, scrollTrigger: { trigger: root, start: 'top 60%', once: true } });

  // the drawn moments are built only when the section is near: none of that work happens while the page loads
  const timelines: (gsap.core.Timeline | undefined)[] = [];
  const progress = services.map(() => 0);
  const play = (i: number, p: number) => { progress[i] = p; timelines[i]?.progress(p); };
  ScrollTrigger.create({
    trigger: root, start: 'top 180%', once: true,
    onEnter: () => services.forEach((s, i) => gsap.delayedCall(i * 0.03, () => { timelines[i] = moment(s, env.dir); timelines[i]!.progress(progress[i]); })),
  });

  let approach = 0, active = -1, scrolled = 0;
  const update = (p: number) => {
    scrolled = p;
    const u = p * n;
    let now = 0;
    services.forEach((s, i) => {
      const local = u - i;                                                // 0…1 = this service's turn
      const enter = i === 0 ? clamp01(approach * 1.4) : clamp01((local + 0.03) / 0.13);
      const exit = i === n - 1 ? 0 : clamp01((local - 0.85) / 0.11);
      gsap.set(s, { opacity: enter * (1 - exit) });
      gsap.set(texts[i], { y: (1 - enter) * 56 - exit * 56 });
      gsap.set(boxes[i], { y: (1 - enter) * 90 - exit * 40, scale: 1 - exit * 0.06 });
      play(i, i === 0 ? 0.3 * approach + 0.7 * clamp01(local / 0.5) : clamp01((local - 0.04) / 0.56));
      if (local >= -0.02) now = i;
    });
    justice.count = p <= 0 ? 0 : Math.min(n, Math.max(0, Math.floor(u - DROP) + 1));
    if (now !== active) {
      active = now;
      services.forEach((s, i) => s.classList.toggle('is-active', i === now));
      ticks.forEach((t, i) => t.classList.toggle('is-on', i === now));
    }
  };
  ScrollTrigger.create({
    trigger: root, start: 'top 80%', end: 'top top', scrub: 0.6,
    onUpdate: (self) => { approach = self.progress; update(scrolled); },
    onRefresh: (self) => { approach = self.progress; },
  });
  const st = ScrollTrigger.create({
    trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.6,
    onUpdate: (self) => update(self.progress), onRefresh: (self) => update(self.progress),
  });

  const goTo = (i: number) => {
    const y = st.start + ((i + 0.55) / n) * (st.end - st.start);
    if (lenis) lenis.scrollTo(y, { duration: 0.9 }); else window.scrollTo(0, y);
  };
  ticks.forEach((tick, i) => {
    tick.addEventListener('pointerenter', () => { justice.focus = i; });
    tick.addEventListener('pointerleave', () => { justice.focus = -1; });
    tick.addEventListener('focus', () => { justice.focus = i; });
    tick.addEventListener('blur', () => { justice.focus = -1; });
    tick.addEventListener('click', () => goTo(i));
  });
  // keyboard: a focused link brings its service to its resting moment
  root.addEventListener('focusin', (e) => {
    const i = services.indexOf((e.target as Element).closest<HTMLElement>('.lsvc')!);
    if (i >= 0 && i !== active) goTo(i);
  });
};
export default scene;
