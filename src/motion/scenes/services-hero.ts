/**
 * Services page — hero (views/services/Hero.astro). Sticky + scrubbed, not a pin.
 * Entrance: nothing is hidden (the title and the lead are the LCP): the huge title settles from a little closer and
 * lower while the stars gather into the constellations (act `sky`); the lead follows with a transform only.
 * Scroll: the text drifts up and fades, the pool of night under it with it, and the camera drifts closer
 * (`sky.push`). Fully reversible.
 */
import { gsap } from 'gsap';
import type { Scene } from '../index';
import { sky } from '../stage/bridge';

const scene: Scene = (root) => {
  const q = gsap.utils.selector(root);
  gsap.timeline({ delay: 0.1 })
    .fromTo(q('.shero__title'), { y: 60, scale: 1.06 }, { y: 0, scale: 1, duration: 2.2, ease: 'expo.out' })
    .fromTo(q('.shero__lead'), { y: 30 }, { y: 0, duration: 1.6 }, 0.25);

  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.5,
      onUpdate: (self) => { sky.push = self.progress; },
    },
  })
    .to(q('.shero__content'), { y: -110, opacity: 0, duration: 0.5 }, 0.12)
    .to(q('.shero__cue'), { opacity: 0, duration: 0.1 }, 0)
    .to(q('.shero__pool'), { opacity: 0, duration: 0.5 }, 0.2)
    .set({}, {}, 1);
};
export default scene;
