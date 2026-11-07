/** S6 · A route draws across the steps, a plane rides it, each step lights up when reached. */
import { gsap } from 'gsap';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  const q = gsap.utils.selector(root);
  const steps = q('.step') as HTMLElement[];
  const light = (p: number) =>
    steps.forEach((s, i) => s.classList.toggle('is-active', p >= i / steps.length));
  if (env.reduce) { light(1); return; }

  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px)', () => {
    const route = root.querySelector<SVGPathElement>('.route__path')!;
    gsap.timeline({
      scrollTrigger: { trigger: root, start: 'top 65%', end: 'bottom 55%', scrub: 0.6, onUpdate: (st) => light(st.progress) },
    })
      .fromTo(route, { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none' }, 0)
      .to(q('.route__plane'), {
        ease: 'none',
        motionPath: { path: route, align: route, alignOrigin: [0.5, 0.5], autoRotate: true },
      }, 0);
  });
  mm.add('(max-width: 1023px)', () => {
    gsap.fromTo(q('.route__line-v'), { scaleY: 0 }, {
      scaleY: 1, transformOrigin: 'top', ease: 'none',
      scrollTrigger: { trigger: root, start: 'top 70%', end: 'bottom 60%', scrub: true, onUpdate: (st) => light(st.progress) },
    });
  });
};
export default scene;
