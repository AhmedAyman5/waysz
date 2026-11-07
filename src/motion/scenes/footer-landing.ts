/** S9 · End of the journey: the footer logo assembles and the plane lands in place. */
import { gsap } from 'gsap';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const q = gsap.utils.selector(root);
  gsap.timeline({ scrollTrigger: { trigger: 'main', start: 'bottom 85%', once: true } })
    .from(q('.mark-wing-left, .mark-wing-right'), { autoAlpha: 0, y: 40, stagger: 0.1, duration: 1 })
    .from(q('.mark-plane'), { x: -160, y: 60, autoAlpha: 0, duration: 1.2, ease: 'power3.out' }, '-=0.6');
};
export default scene;
