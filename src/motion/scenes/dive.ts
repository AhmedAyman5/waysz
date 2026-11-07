/**
 * S3 · "The Dive": the hero pins and the camera flies into the road of the logo.
 * The hero background, the road (negative space) and the next section share one color,
 * so when the road fills the screen we are already "inside" the next section.
 * Requirement: .hero__mark's offsetParent is the hero (hero has position: relative).
 */
import { gsap } from 'gsap';
import type { Scene } from '../index';
import { LOGO } from '../config';

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const q = gsap.utils.selector(root);
  const mark = q('.hero__mark')[0] as HTMLElement;
  const [OX, OY] = LOGO.roadPoint;

  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px)', () => {
    const dx = () => root.clientWidth / 2 - (mark.offsetLeft + mark.offsetWidth * OX);
    const dy = () => root.clientHeight / 2 - (mark.offsetTop + mark.offsetHeight * OY);
    gsap.timeline({
      defaults: { ease: 'power2.in' },
      scrollTrigger: {
        trigger: root, start: 'top top', end: '+=130%',
        pin: true, scrub: 0.8, invalidateOnRefresh: true,
      },
    })
      .to(q('.hero__content'), { autoAlpha: 0, y: -80, duration: 0.35, ease: 'power2.out' }, 0)
      .to(mark, { x: dx, y: dy, scale: LOGO.diveScale, transformOrigin: `${OX * 100}% ${OY * 100}%`, duration: 1 }, 0)
      .to(mark, { autoAlpha: 0, duration: 0.2 }, 0.8)
      .to(q('.hero__glow'), { autoAlpha: 0, duration: 0.4 }, 0.6);   // optional decor, if present
  });
  mm.add('(max-width: 1023px)', () => {
    gsap.to(mark, {
      scale: 1.4, autoAlpha: 0, ease: 'none',
      scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true },
    });
  });
};
export default scene;
