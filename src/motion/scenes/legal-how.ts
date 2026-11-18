/**
 * Legal page — how we work (views/legal/How.astro). No pin, no sticky.
 * The line fills with scroll (scrubbed, reversible) and each step lights up when the line reaches it.
 * Wide: a horizontal line that grows from the reading side (transform-origin per direction in CSS). Small: vertical.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';

const scene: Scene = (root) => {
  const steps = gsap.utils.toArray<HTMLElement>('.lstep', root);
  const fill = root.querySelector<HTMLElement>('.lhow__fill')!;
  const route = root.querySelector<HTMLElement>('.lhow__route')!;
  root.classList.add('is-scrub');

  const title = root.querySelector<HTMLElement>('.lhow__title')!;
  const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.1, stagger: 0.07, scrollTrigger: { trigger: title, start: 'top 84%', once: true } });

  const seen = new Set<HTMLElement>();
  const reach = (count: number) => steps.forEach((s, i) => {
    s.classList.toggle('is-active', i < count);
    if (i < count && !seen.has(s)) {
      seen.add(s);
      gsap.fromTo(s.querySelector('.lstep__node'), { scale: 0.4 }, { scale: 1, duration: 0.7, ease: 'back.out(2.4)' });
    }
  });
  gsap.matchMedia().add({ wide: '(min-width: 1024px)', small: '(max-width: 1023px)' }, (ctx) => {
    const wide = ctx.conditions!.wide;
    gsap.set(fill, wide ? { scaleX: 0, scaleY: 1 } : { scaleX: 1, scaleY: 0 });
    const set = (p: number) => {
      gsap.set(fill, wide ? { scaleX: p } : { scaleY: p });
      reach(steps.filter((_, i) => p >= i / steps.length + 0.02).length);
    };
    const st = ScrollTrigger.create({
      trigger: route, start: wide ? 'top 84%' : 'top 74%', end: wide ? 'top 40%' : 'bottom 62%', scrub: 0.7,
      onUpdate: (self) => set(self.progress), onRefresh: (self) => set(self.progress),
    });
    return () => st.kill();
  });
};
export default scene;
