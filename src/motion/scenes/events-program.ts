/**
 * Events page — the ten services, "the programme" (views/events/Services.astro). No pin, nothing hidden.
 * The heading rises by words once. Each card, when it reaches the light: a follow spot sweeps across it, the gold
 * rule along its top draws from the middle, its line icon draws itself. Cards never move (they carry the layout's
 * own offset); only their decorative parts animate.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  const title = root.querySelector<HTMLElement>('.gsvc__title')!;
  const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 70%', once: true } })
    .fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.2, stagger: 0.08 })
    .fromTo(root.querySelector('.gsvc__head .g-lead'), { y: 24 }, { y: 0, duration: 1 }, 0.25);

  gsap.utils.toArray<HTMLElement>('.gcard', root).forEach((card) => {
    const paths = card.querySelectorAll('.gcard__icon > *');
    const sweep = card.querySelector('.gcard__sweep');
    gsap.set(card.querySelector('.gcard__rule'), { scaleX: 0 });
    gsap.set(paths, { drawSVG: '0%' });
    gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 82%', once: true } })
      .fromTo(sweep, { xPercent: env.dir > 0 ? -120 : 280 }, { xPercent: env.dir > 0 ? 280 : -120, duration: 1.3, ease: 'power2.inOut' })
      .fromTo(sweep, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' }, 0)
      .to(sweep, { opacity: 0, duration: 0.4, ease: 'none' }, 0.9)
      .to(card.querySelector('.gcard__rule'), { scaleX: 1, duration: 1.1, ease: 'expo.out' }, 0.25)
      .to(paths, { drawSVG: '100%', duration: 1.1, stagger: 0.08, ease: 'power2.inOut' }, 0.15);
  });
  ScrollTrigger.refresh();
};
export default scene;
