/** S11 · Services tabs: cards move to their new places with Flip. Cards carry data-area. */
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  const q = gsap.utils.selector(root);
  const cards = q('.service-card') as HTMLElement[];
  const tabs = q('.tab') as HTMLButtonElement[];

  const select = (area: string) => {
    tabs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.area === area)));
    const state = Flip.getState(cards);
    cards.forEach((c) => { c.hidden = area !== 'all' && c.dataset.area !== area; });
    if (env.reduce) { ScrollTrigger.refresh(); return; }
    Flip.from(state, {
      duration: 0.6, ease: 'power2.inOut', scale: true, absolute: true,
      onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.4 }),
      onLeave: (els) => gsap.to(els, { autoAlpha: 0, scale: 0.9, duration: 0.3 }),
      onComplete: () => ScrollTrigger.refresh(),
    });
  };

  tabs.forEach((t) => t.addEventListener('click', () => select(t.dataset.area ?? 'all')));
  const initial = location.hash.slice(1);
  if (initial && tabs.some((t) => t.dataset.area === initial)) select(initial);
};
export default scene;
