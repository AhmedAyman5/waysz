/** S4 · The four service areas as sticky cards that stack; icons draw in. CSS does the sticking. */
import { gsap } from 'gsap';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const cards = gsap.utils.selector(root)('.dest-card') as HTMLElement[];
  cards.forEach((card, i) => {
    gsap.fromTo(card.querySelectorAll('.dest-card__icon :is(path, circle, line, rect, polyline)'),
      { drawSVG: '0%' },
      { drawSVG: '100%', duration: 1.4, ease: 'power2.inOut', stagger: 0.1,
        scrollTrigger: { trigger: card, start: 'top 70%', once: true } });
    const next = cards[i + 1];
    if (next) {
      gsap.to(card, {
        scale: 0.92, opacity: 0.5, ease: 'none',
        scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 25%', scrub: true },
      });
    }
  });
};
export default scene;
