/**
 * Legal page — «كيف يمكننا مساعدتك؟», the walk between the columns (views/legal/Help.astro).
 * CSS sticky holds the screen (not a pin). Scroll walks the camera of acts/justice.ts down the colonnade
 * (bridge.justice.walk) and gives each of the nine specialties its beat: it arrives from the side of the column
 * that brings it, rests, and passes by like the column does. Scrubbed, reversible; faded with opacity only.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { justice } from '../stage/bridge';

const clamp01 = gsap.utils.clamp(0, 1);
const ease = (t: number) => t * t * (3 - 2 * t);
const LEAD = 0.07;                                           // part of the walk done while the section arrives

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const items = gsap.utils.toArray<HTMLElement>('.lhelp__item', root);
  const ticks = gsap.utils.toArray<HTMLElement>('.lhelp__ticks span', root);
  const n = items.length;
  root.classList.add('is-scrub');

  const title = root.querySelector<HTMLElement>('.lhelp__title')!;
  const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.1, stagger: 0.07, scrollTrigger: { trigger: root, start: 'top 35%', once: true } });

  let approach = 0, active = -1, scrolled = 0;
  const update = (p: number) => {
    scrolled = p;
    justice.walk = LEAD * approach + (1 - LEAD) * p;
    const u = p * n;
    let now = 0;
    items.forEach((el, i) => {
      const local = u - i;
      const enter = ease(i === 0 ? clamp01(approach * 2 - 1) : clamp01((local + 0.12) / 0.3));
      const exit = i === n - 1 ? 0 : ease(clamp01((local - 0.7) / 0.3));
      const side = (el.dataset.side === 'end' ? 1 : -1) * env.dir;          // which edge of the screen its column is on
      gsap.set(el, {
        opacity: enter * (1 - exit), yPercent: -50,
        x: side * ((1 - enter) * -70 + exit * 120), y: (1 - enter) * 30, scale: 0.92 + enter * 0.08 + exit * 0.22,
      });
      if (local >= -0.06) now = i;
    });
    if (now !== active) { active = now; ticks.forEach((t, i) => t.classList.toggle('is-on', i === now)); }
  };
  ScrollTrigger.create({
    trigger: root, start: 'top bottom', end: 'top top', scrub: 0.6,
    onUpdate: (self) => { approach = self.progress; update(scrolled); },
    onRefresh: (self) => { approach = self.progress; },
  });
  ScrollTrigger.create({
    trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.6,
    onUpdate: (self) => update(self.progress), onRefresh: (self) => update(self.progress),
  });
};
export default scene;
