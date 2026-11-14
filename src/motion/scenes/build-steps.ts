/**
 * Software page — the four steps of a website project (views/software/Process.astro). No pin, no sticky.
 * The line fills with scroll (scrubbed, reversible); each step lights up when the line reaches it and its
 * short call types itself in once (ScrambleText — Latin only, the call is decorative).
 * Wide: a horizontal line (it grows from the reading side: transform-origin is set per direction in CSS).
 * Small: a vertical line.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';

gsap.registerPlugin(ScrambleTextPlugin);

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const steps = gsap.utils.toArray<HTMLElement>('.bstep', root);
  const fill = root.querySelector<HTMLElement>('.steps__fill')!;
  const route = root.querySelector<HTMLElement>('.steps__route')!;
  root.classList.add('is-scrub');

  const title = root.querySelector<HTMLElement>('.steps__title')!;
  const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.1, stagger: 0.07, scrollTrigger: { trigger: title, start: 'top 84%', once: true } });
  gsap.fromTo(root.querySelector('.steps__media'), { scale: 1.16 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });

  const typed = new Set<HTMLElement>();
  const calls = steps.map((s) => s.querySelector<HTMLElement>('.bstep__call')!);
  const texts = calls.map((c) => c.textContent ?? '');
  gsap.set(calls, { opacity: 0 });
  const reach = (count: number) => steps.forEach((s, i) => {
    const on = i < count;
    s.classList.toggle('is-active', on);
    if (on && !typed.has(s)) {
      typed.add(s);
      gsap.fromTo(s.querySelector('.bstep__node'), { scale: 0.4 }, { scale: 1, duration: 0.7, ease: 'back.out(2.4)' });
      gsap.set(calls[i], { opacity: 1 });
      gsap.fromTo(calls[i], { scrambleText: { text: ' ', chars: ' ' } }, { duration: 1.1, ease: 'none', scrambleText: { text: texts[i], chars: '{}()<>=/;.', speed: 0.5 } });
    }
  });

  gsap.matchMedia().add({ wide: '(min-width: 1024px)', small: '(max-width: 1023px)' }, (ctx) => {
    const wide = ctx.conditions!.wide;
    gsap.set(fill, wide ? { scaleX: 0, scaleY: 1 } : { scaleX: 1, scaleY: 0 });
    const set = (p: number) => {
      gsap.set(fill, wide ? { scaleX: p } : { scaleY: p });
      // a step is reached when the line passes its node (the start of its column / its own top)
      reach(steps.filter((_, i) => p >= i / steps.length + 0.02).length);
    };
    const st = ScrollTrigger.create({
      trigger: route, start: wide ? 'top 82%' : 'top 74%', end: wide ? 'top 34%' : 'bottom 62%', scrub: 0.7,
      onUpdate: (self) => set(self.progress), onRefresh: (self) => set(self.progress),
    });
    return () => st.kill();
  });
};
export default scene;
