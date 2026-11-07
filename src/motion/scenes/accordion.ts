/** S12 · FAQ accordion. Markup: .faq__item > button[aria-expanded][aria-controls] + .faq__panel[inert] */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  root.querySelectorAll<HTMLElement>('.faq__item').forEach((item) => {
    const btn = item.querySelector<HTMLButtonElement>('button')!;
    const panel = item.querySelector<HTMLElement>('.faq__panel')!;
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      panel.toggleAttribute('inert', open);
      gsap.to(panel, {
        height: open ? 0 : 'auto',
        duration: env.reduce ? 0 : 0.45,
        ease: 'power2.inOut',
        onComplete: () => ScrollTrigger.refresh(),
      });
    });
  });
};
export default scene;
