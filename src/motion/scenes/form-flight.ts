/** S13 · Form feedback: a paper plane flies off on success, a short shake on error. */
import { gsap } from 'gsap';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  const form = root.querySelector('form');
  const plane = root.querySelector<HTMLElement>('.form__plane');
  if (!form) return;

  form.addEventListener('waysz:form-success', () => {
    if (env.reduce || !plane) return;
    gsap.timeline()
      .to(plane, {
        duration: 1, ease: 'power2.in', rotation: -25 * env.dir, autoAlpha: 0,
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 140 * env.dir, y: -40 }, { x: 360 * env.dir, y: -260 }],
          curviness: 1.4,
        },
      })
      .set(plane, { x: 0, y: 0, rotation: 0 })
      .to(plane, { autoAlpha: 1, duration: 0.4, delay: 1.2 });
  });

  form.addEventListener('waysz:form-error', () => {
    if (env.reduce) return;
    gsap.fromTo(form, { x: 0 }, { keyframes: { x: [-8, 8, -5, 5, 0] }, duration: 0.45, ease: 'none' });
  });
};
export default scene;
