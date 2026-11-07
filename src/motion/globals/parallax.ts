import { gsap } from 'gsap';
import { isFree } from './util';

/** data-parallax="0.15" — drifts on scroll by that factor. Desktop only (called from globals). */
export function initParallax() {
  gsap.utils.toArray<HTMLElement>('[data-parallax]').filter(isFree).forEach((el) => {
    const f = parseFloat(el.dataset.parallax || '0.15');
    gsap.fromTo(el, { yPercent: -f * 100 }, {
      yPercent: f * 100,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}
