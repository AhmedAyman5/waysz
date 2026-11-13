/**
 * Immigration page — hero (views/immigration/Hero.astro). Sticky + scrubbed, not a pin.
 * Entrance: the headline words rise from a mask (lead and buttons are never hidden: they are the LCP).
 * Scroll: the footage pushes in and the view closes into a cabin-window shape that sinks into the night.
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  const q = gsap.utils.selector(root);
  const title = root.querySelector<HTMLElement>('.phero__title')!;
  if (env.reduce) { gsap.set(title, { autoAlpha: 1 }); return; }

  const split = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' });   // never chars (Arabic)
  gsap.set(title, { autoAlpha: 1 });
  gsap.timeline({ delay: 0.15 })
    .fromTo(split.words, { yPercent: 118 }, { yPercent: 0, duration: 1.3, stagger: 0.08 })
    .fromTo(q('.phero__plate'), { scale: 1.12 }, { scale: 1, duration: 2.4, ease: 'power2.out' }, 0);

  const wide = matchMedia('(min-width: 1024px)').matches;
  const closed = wide ? 'inset(14% 34% 22% 34% round 999px)' : 'inset(16% 16% 30% 16% round 999px)';
  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.5 },
  })
    .to(q('.phero__content'), { y: -100, autoAlpha: 0, duration: 0.32 }, 0)
    .to(q('.phero__scrim'), { autoAlpha: 0, duration: 0.4 }, 0.1)
    .fromTo(q('.phero__window'), { clipPath: 'inset(0% 0% 0% 0% round 0px)' }, { clipPath: closed, duration: 0.7, ease: 'power2.inOut' }, 0.12)
    .to(q('.phero__window'), { yPercent: 16, scale: 0.92, autoAlpha: 0, duration: 0.3, ease: 'power1.in' }, 0.7)
    .set({}, {}, 1);
};
export default scene;
