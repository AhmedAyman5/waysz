/**
 * Events page — the ten services, "the programme" (views/events/Services.astro). No pin; no text is hidden.
 * The heading rises by words once. Each card, when it reaches the light: a follow spot sweeps across it, the gold
 * rule along its top draws from the middle, its line icon draws itself. Cards never move (they carry the layout's
 * own offset); only their decorative parts animate.
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  const title = root.querySelector<HTMLElement>('.gsvc__title')!;
  const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 70%', once: true } })
    .fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.2, stagger: 0.08 })
    .fromTo(root.querySelector('.gsvc__head .g-lead'), { y: 24 }, { y: 0, duration: 1 }, 0.25);

  // one IntersectionObserver for the ten cards (no scroll triggers to measure at page load). The icon is hidden by
  // CSS only while JS runs (base: .js), and draws itself when its card reaches the light.
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const card = e.target as HTMLElement;
    const paths = card.querySelectorAll('.gcard__icon > *');
    const sweep = card.querySelector('.gcard__sweep');
    gsap.timeline()
      .fromTo(sweep, { xPercent: env.dir > 0 ? -120 : 280 }, { xPercent: env.dir > 0 ? 280 : -120, duration: 1.3, ease: 'power2.inOut' })
      .fromTo(sweep, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' }, 0)
      .to(sweep, { opacity: 0, duration: 0.4, ease: 'none' }, 0.9)
      .fromTo(card.querySelector('.gcard__rule'), { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 1.1, ease: 'expo.out' }, 0.25)
      .set(card.querySelector('.gcard__icon'), { opacity: 1 }, 0.15)
      .fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.1, stagger: 0.08, ease: 'power2.inOut' }, 0.15);
  }), { rootMargin: '0px 0px -16% 0px' });
  root.querySelectorAll('.gcard').forEach((card) => io.observe(card));
};
export default scene;
