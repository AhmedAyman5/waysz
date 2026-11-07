import { gsap } from 'gsap';
import type { MotionEnv } from '../index';
import { isFree } from './util';

/** data-draw (once on enter) · data-draw="scrub" (follows scroll). On path/line/polyline/circle/rect. */
export function initDraw(env: MotionEnv) {
  gsap.utils.toArray<SVGGeometryElement>('[data-draw]').filter(isFree).forEach((p) => {
    if (env.reduce) return;
    const scrub = p.dataset.draw === 'scrub';
    gsap.fromTo(
      p,
      { drawSVG: env.rtl ? '100% 100%' : '0%' },   // RTL lines draw from their end
      {
        drawSVG: '0% 100%',
        duration: 1.6,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: p.closest('section') ?? p,
          start: 'top 75%',
          ...(scrub ? { end: 'bottom 60%', scrub: 0.5 } : { once: true }),
        },
      },
    );
  });
}
