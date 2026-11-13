/**
 * Home §1.5 — "How we work": the plane flies a route across the night-Earth globe and lights the four
 * steps one by one (views/home/How.astro). This scene owns scroll and the HTML route line; the globe is
 * drawn by the WebGL stage (bridge.route → acts/globe.ts) or stays a still image (css tier).
 * Wide screens: one sticky screen, the plane rests at each stop. Small screens: the globe holds the top of
 * the screen and the steps scroll over it. CSS does the sticking — not a pin.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { route } from '../stage/bridge';
import { addAct } from '../stage';

const clamp01 = gsap.utils.clamp(0, 1);
const ease = (t: number) => t * t * (3 - 2 * t);
/** wide screens: scroll progress → position on the route, resting at each stop */
const HOPS = [[0.14, 0.36], [0.42, 0.64], [0.7, 0.92]];

const scene: Scene = (root, env) => {
  const steps = gsap.utils.toArray<HTMLElement>('.step', root);
  if (env.reduce) return;
  const q = gsap.utils.selector(root);
  const host = root.querySelector<HTMLElement>('.how__stage')!;
  const track = root.querySelector<HTMLElement>('.how__track')!;
  const line = root.querySelector<HTMLElement>('.how__line')!;
  const fill = q('.how__line-fill'), plane = q('.how__plane');
  root.classList.add('is-scrub');
  route.side = env.dir;

  const setHead = (head: number, vertical: boolean) => {
    route.head = head;
    const f = head / (steps.length - 1);
    steps.forEach((s, i) => s.classList.toggle('is-active', head >= i - 0.02));
    if (vertical) { gsap.set(fill, { scaleY: f, scaleX: 1 }); gsap.set(plane, { y: f * line.clientHeight, x: 0 }); }
    else { gsap.set(fill, { scaleX: f, scaleY: 1 }); gsap.set(plane, { x: f * line.clientWidth * env.dir, y: 0 }); }
  };

  // the globe rises as the section arrives
  ScrollTrigger.create({
    trigger: root, start: 'top bottom', end: 'top 15%', scrub: 0.6,
    onUpdate: (self) => { route.enter = ease(self.progress); },
  });
  const title = root.querySelector<HTMLElement>('.how__title')!;
  const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.fromTo(words, { yPercent: 118 }, {
    yPercent: 0, duration: 1.1, stagger: 0.08,
    scrollTrigger: { trigger: root, start: 'top 45%', once: true },
  });

  gsap.matchMedia().add({ wide: '(min-width: 1024px)', small: '(max-width: 1023px)' }, (ctx) => {
    const { wide } = ctx.conditions!;
    route.compact = !wide;
    if (wide) {
      const fly = (self: ScrollTrigger) => {
        const p = self.progress;
        let head = 0;
        HOPS.forEach(([a, b], k) => { if (p > a) head = k + ease(clamp01((p - a) / (b - a))); });
        setHead(head, false);
      };
      ScrollTrigger.create({ trigger: track, start: 'top top', end: 'bottom bottom', scrub: 0.6, onUpdate: fly, onRefresh: fly });
    } else {
      const fly = (self: ScrollTrigger) => setHead(self.progress * (steps.length - 1), true);
      ScrollTrigger.create({ trigger: q('.how__steps')[0], start: 'top 62%', end: 'bottom 62%', scrub: 0.6, onUpdate: fly, onRefresh: fly });
    }
  });

  // WebGL tiers: load the globe (its own chunk + the night map) when the section is near
  ScrollTrigger.create({
    trigger: root, start: 'top 250%', once: true,
    onEnter: () => {
      if (env.tier === 'css') return;
      void addAct(env, async () => (await import('../stage/acts/globe')).createGlobeAct(host, env.tier === 'high' ? 'high' : 'lite'));
    },
  });

  if (import.meta.env.DEV && new URLSearchParams(location.search).get('globe') === 'poster') {
    root.classList.add('is-poster');                         // see waysz-media: re-rendering the globe still
    route.poster = true;
  }
};
export default scene;
