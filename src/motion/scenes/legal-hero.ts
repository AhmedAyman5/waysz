/**
 * Legal page — hero (views/legal/Hero.astro). Sticky + scrubbed, not a pin.
 * Entrance: the headline rises by words; the lead and the buttons are never hidden (LCP). Scroll: the text leaves
 * upward while the camera of the scales orbits (scenes/legal-thread.ts moves it); the still of the css tier
 * drifts back a little. Fully reversible.
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  const q = gsap.utils.selector(root);
  const title = root.querySelector<HTMLElement>('.lhero__title')!;
  if (env.reduce) { gsap.set(title, { autoAlpha: 1 }); return; }

  const split = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' });   // words only (Arabic)
  gsap.set(title, { autoAlpha: 1 });
  gsap.timeline({ delay: 0.15 })
    .fromTo(split.words, { yPercent: 118 }, { yPercent: 0, duration: 1.3, stagger: 0.09 })
    .fromTo(q('.lhero__still img'), { scale: 1.08 }, { scale: 1, duration: 2.4, ease: 'power2.out' }, 0);

  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.5 },
  })
    .to(q('.lhero__content'), { y: -110, opacity: 0, duration: 0.5 }, 0.3)
    .to(q('.lhero__scrim'), { opacity: 0, duration: 0.5 }, 0.4)
    .to(q('.lhero__still img'), { yPercent: -8, duration: 1 }, 0)
    .set({}, {}, 1);
};
export default scene;
