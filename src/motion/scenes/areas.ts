/**
 * Home §1.3 — the four service areas on one sticky screen (views/home/Areas.astro).
 * Scroll: section title in the cloud → area 1 … 4, each resting for a moment. One scrubbed timeline moves
 * the text and the css-tier wipes; the same progress goes to the WebGL stage (bridge.areas → acts/wipe.ts),
 * which draws the photo transitions when it is live. CSS does the sticking — this is not a pin.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { lenis } from '../smooth-scroll';
import { areas } from '../stage/bridge';
import { addAct } from '../stage';

const clamp01 = gsap.utils.clamp(0, 1);
const TAIL = 0.4;                                            // the last card rests before the section lets go
/** transition window inside unit k (as fractions of the unit) */
const span = (k: number) => (k === 0 ? [0.1, 0.8] : [0.3, 0.95]);

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const host = root.querySelector<HTMLElement>('.areas__stage')!;
  const intro = root.querySelector<HTMLElement>('.areas__intro')!;
  const title = root.querySelector<HTMLElement>('.areas__title')!;
  const cards = gsap.utils.toArray<HTMLElement>('.area', root);
  const ticks = gsap.utils.toArray<HTMLElement>('.areas__ticks span', root);
  const n = cards.length;
  const total = n + TAIL;
  root.classList.add('is-scrub');

  const part = (card: HTMLElement, sel: string) => card.querySelector<HTMLElement>(sel)!;
  const words = (el: HTMLElement) =>
    SplitText.create(el, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;   // never chars (Arabic)

  // css-tier wipes: a different way in for each photo (the WebGL tiers have their own, see wipe.glsl.ts)
  const wipes = [
    null,
    [env.dir === 1 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)', 'inset(0% 0% 0% 0%)'],
    ['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'],
    ['circle(0% at 50% 62%)', 'circle(125% at 50% 62%)'],
  ];

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.6,
      onUpdate: (self) => {
        const u = self.progress * total;
        let p = n;
        for (let k = 0; k < n; k++) {
          const [a, b] = span(k);
          if (u < k + b) { const t = clamp01((u - k - a) / (b - a)); p = k + t * t * (3 - 2 * t); break; }
        }
        areas.progress = p;
        areas.hold = self.progress;
        const active = Math.round(p) - 1;
        cards.forEach((c, i) => c.classList.toggle('is-active', i === active));
        ticks.forEach((t, i) => t.classList.toggle('is-on', i === active));
        root.classList.toggle('is-in', p > 0.6);
      },
    },
  });

  cards.forEach((card, k) => {
    const [a, b] = span(k);
    const s = k + a, d = b - a;
    const body = part(card, '.area__body');
    const media = part(card, '.area__media');
    const photo = part(card, '.area__photo');
    const strokes = card.querySelectorAll('.area__icon :is(path, circle)');
    const nameWords = words(part(card, '.area__name'));

    // out: the title (first unit) or the previous card
    if (k === 0) {
      tl.to(title, { y: -80, opacity: 0, duration: d * 0.4, ease: 'power1.in' }, s)
        .to(intro, { clipPath: 'inset(0% 0% 100% 0%)', duration: d * 0.7, ease: 'power2.inOut' }, s + d * 0.3);
    } else {
      const prev = cards[k - 1];
      tl.to(part(prev, '.area__text'), { y: -60, duration: d * 0.4, ease: 'power1.in' }, s)
        .to(part(prev, '.area__body'), { opacity: 0, duration: d * 0.35, ease: 'power1.in' }, s)
        .to(part(prev, '.area__scrim'), { opacity: 0, duration: d * 0.5 }, s + d * 0.2)
        .fromTo(media, { clipPath: wipes[k]![0] }, { clipPath: wipes[k]![1], duration: d, ease: 'power2.inOut' }, s);
    }
    // in
    tl.fromTo(photo, { scale: 1.22 }, { scale: 1, duration: d + 0.5, ease: 'power1.out' }, s)
      .fromTo(part(card, '.area__scrim'), { opacity: 0 }, { opacity: 1, duration: d * 0.5 }, s + d * 0.35)
      .set(body, { opacity: 1 }, s + d * 0.4)
      .fromTo(strokes, { drawSVG: '0%' }, { drawSVG: '100%', duration: d * 0.5, stagger: d * 0.03, ease: 'power1.inOut' }, s + d * 0.4)
      .fromTo(card.querySelectorAll('[data-tilt]'), { rotation: -14 * env.dir, transformOrigin: '50% 50%' },
        { rotation: 0, duration: d * 0.5, ease: 'power2.out' }, s + d * 0.5)
      .fromTo(nameWords, { yPercent: 118 }, { yPercent: 0, duration: d * 0.42, stagger: d * 0.05, ease: 'power3.out' }, s + d * 0.45)
      .fromTo([part(card, '.area__copy'), part(card, '.area__link')], { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: d * 0.32, stagger: d * 0.07, ease: 'power2.out' }, s + d * 0.66);
  });
  tl.set({}, {}, total);                                     // timeline length = scroll length

  // keyboard: a focused link brings its card on screen (the others are transparent, not removed)
  cards.forEach((card, k) => {
    part(card, '.area__link').addEventListener('focus', () => {
      const st = tl.scrollTrigger!;
      if (card.classList.contains('is-active')) return;
      const y = st.start + ((k + 1.1) / total) * (st.end - st.start);
      if (lenis) lenis.scrollTo(y, { duration: 0.8 }); else window.scrollTo(0, y);
    });
  });

  // WebGL tiers: register the act once the section is near (its photos start loading then, too)
  ScrollTrigger.create({
    trigger: root, start: 'top 250%', once: true,
    onEnter: () => {
      const images = cards.map((c) => c.querySelector('img')!);
      void addAct(env, async () => (await import('../stage/acts/wipe')).createWipeAct(host, images, env.dir, env.desktop));
    },
  });
};
export default scene;
