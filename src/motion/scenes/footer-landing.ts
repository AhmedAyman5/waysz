/**
 * Footer §1.8 — "Landed". As the footer comes into view the runway centre line streaks past and slows to a
 * stop (scrubbed), the threshold lights come on, the logo wings rise and the plane touches down in its place.
 * The legal notice is never animated.
 */
import { gsap } from 'gsap';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const q = gsap.utils.selector(root);
  const main = document.querySelector('main');            // desktop: the footer is a sticky curtain behind <main>

  // ground roll: fast at first, then braking — tied to the last stretch of scroll
  gsap.fromTo(q('.site-footer__dashes'), { x: 520 * env.dir }, {
    x: 0, ease: 'power3.out',
    scrollTrigger: { trigger: main, start: 'bottom bottom', end: 'max', scrub: 0.8 },
  });

  gsap.timeline({ scrollTrigger: { trigger: main, start: 'bottom 85%', once: true } })
    .from(q('.site-footer__lights'), { autoAlpha: 0, duration: 1.2 })
    .from(q('.mark-wing-left, .mark-wing-right'), { autoAlpha: 0, y: 40, stagger: 0.1, duration: 1 }, 0)
    // the logo never mirrors: the plane always comes down from the upper left onto its spot
    .from(q('.mark-plane'), { x: -190, y: -110, rotation: 14, transformOrigin: '50% 50%', autoAlpha: 0, duration: 1.5, ease: 'power3.out' }, 0.2);
};
export default scene;
