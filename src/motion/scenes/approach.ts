/**
 * Home §1.6 — "Final approach" (views/home/Cta.astro). No pin.
 * The runway photo settles as the section arrives (descent), the headline rises word by word, the
 * approach lights start running (CSS animation, only while the section is on screen).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const q = gsap.utils.selector(root);
  const title = root.querySelector<HTMLElement>('.cta__title')!;
  const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;

  // descent: the horizon comes up to meet us
  gsap.fromTo(q('.cta__media'), { scale: 1.28, yPercent: 7 }, {
    scale: 1, yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: root, start: 'top bottom', end: 'top top', scrub: 0.6 },
  });
  gsap.fromTo(q('.cta__lights'), { yPercent: 30, opacity: 0 }, {
    yPercent: 0, opacity: 1, ease: 'none',
    scrollTrigger: { trigger: root, start: 'top 80%', end: 'top 25%', scrub: 0.6 },
  });
  ScrollTrigger.create({
    trigger: root, start: 'top bottom', end: 'bottom top',
    onToggle: (self) => root.classList.toggle('is-live', self.isActive),
  });

  gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 48%', once: true } })
    .fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.2, stagger: 0.07 })
    .fromTo(q('.cta__text'), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.9 }, 0.35)
    .fromTo(q('.cta__actions'), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.9 }, 0.5);
};
export default scene;
