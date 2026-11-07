/** S8 · The WaysZ Visa link as a boarding pass; a stamp lands on it. */
import { gsap } from 'gsap';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const q = gsap.utils.selector(root);
  gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 70%', once: true } })
    .fromTo(q('.pass'), { autoAlpha: 0, y: 60, rotation: -2 * env.dir }, { autoAlpha: 1, y: 0, rotation: 0, duration: 1 })
    .fromTo(q('.pass__perf'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, ease: 'none' }, '-=0.5')
    .fromTo(q('.stamp'), { autoAlpha: 0, scale: 1.8, rotation: -18 }, { autoAlpha: 1, scale: 1, rotation: -8, duration: 0.35, ease: 'power4.in' })
    .to(q('.pass'), { x: 4, duration: 0.05, repeat: 3, yoyo: true, ease: 'none' });   // stamp impact
};
export default scene;
