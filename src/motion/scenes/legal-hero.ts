/**
 * Legal page — hero (views/legal/Hero.astro). Sticky + scrubbed, not a pin.
 * Entrance: nothing is hidden (the headline is the LCP on phones) — its two lines only settle into place. Scroll: the text leaves
 * upward while the camera of the scales orbits (scenes/legal-thread.ts moves it); the still of the css tier
 * drifts back a little. Fully reversible.
 */
import { gsap } from 'gsap';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  const q = gsap.utils.selector(root);
  if (env.reduce) return;

  gsap.timeline({ delay: 0.15 })
    .fromTo(q('.lhero__line'), { y: 54 }, { y: 0, duration: 1.4, stagger: 0.12 })
    .fromTo(q('.lhero__lead, .lhero__actions'), { y: 30 }, { y: 0, duration: 1.2, stagger: 0.08 }, 0.15)
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
