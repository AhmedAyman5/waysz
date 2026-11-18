/**
 * Events page — hero (views/events/Hero.astro). Sticky + scrubbed, not a pin.
 * Entrance: nothing is hidden (the headline / lead are the LCP): the two lines of the title settle, the lead and the
 * buttons follow with a transform only. Scroll: while the curtain opens (scenes/events-thread.ts → act `gala`)
 * the text drifts up and fades out of the light; the pool of the follow spot fades with it. Fully reversible.
 */
import { gsap } from 'gsap';
import type { Scene } from '../index';

const scene: Scene = (root) => {
  const q = gsap.utils.selector(root);
  gsap.timeline({ delay: 0.1 })
    .fromTo(q('.ghero__line'), { y: 46 }, { y: 0, duration: 1.5, stagger: 0.12 })
    .fromTo(q('.ghero__lead, .ghero__actions'), { y: 28 }, { y: 0, duration: 1.3, stagger: 0.08 }, 0.2);

  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.5 },
  })
    .to(q('.ghero__content'), { y: -90, opacity: 0, duration: 0.22 }, 0.05)
    .to(q('.ghero__cue'), { opacity: 0, duration: 0.06 }, 0)
    .to(q('.ghero__pool'), { opacity: 0, duration: 0.3 }, 0.1)
    .set({}, {}, 1);
};
export default scene;
