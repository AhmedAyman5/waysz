/** S2 · Hero entrance: headline words rise, wings part, the plane takes off along the road. */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { LOGO, introDone } from '../config';

const scene: Scene = async (root, env) => {
  const q = gsap.utils.selector(root);
  gsap.set(q('[data-intro]'), { autoAlpha: 1 });
  if (env.reduce) return;
  await introDone();

  const plane = root.querySelector<SVGPathElement>('.mark-plane')!;
  const road = root.querySelector<SVGPathElement>('.mark-road')!;
  const title = root.querySelector<HTMLElement>('.hero__title')!;
  const split = SplitText.create(title, { type: 'words', mask: 'words', aria: 'auto' });
  gsap.set(plane, { autoAlpha: 0 });

  gsap.timeline()
    .from(split.words, { yPercent: 110, duration: 1.1, stagger: 0.06 })
    .from(q('.hero__lead, .hero__actions'), { y: 30, autoAlpha: 0, duration: 0.9, stagger: 0.12 }, '-=0.7')
    .from(q('.mark-wing-left'), { x: 40, autoAlpha: 0, duration: 1 }, 0.1)
    .from(q('.mark-wing-right'), { x: -40, autoAlpha: 0, duration: 1 }, 0.1)
    .set(plane, { autoAlpha: 1 }, 0.5)
    .to(plane, {
      duration: 1.1,
      ease: 'power1.inOut',
      motionPath: { path: road, align: road, alignOrigin: [0.5, 0.5], autoRotate: LOGO.planeHeading },
    }, 0.5)
    .to(plane, { x: 0, y: 0, rotation: 0, duration: 0.4, ease: 'power2.out' });
};
export default scene;
