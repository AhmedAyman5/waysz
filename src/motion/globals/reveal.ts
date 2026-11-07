import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionEnv } from '../index';
import { isFree } from './util';

const FROM: Record<string, gsap.TweenVars> = {
  up: { y: 48 },
  fade: {},
  scale: { scale: 0.94 },
  clip: { clipPath: 'inset(0 0 100% 0)' },
};

/** data-reveal="up|fade|scale|clip" — enters once when 85% into view. Use sparingly. */
export function initReveal(env: MotionEnv) {
  const items = gsap.utils.toArray<HTMLElement>('[data-reveal]').filter(isFree);
  if (!items.length) return;
  if (env.reduce) { gsap.set(items, { autoAlpha: 1 }); return; }
  ScrollTrigger.batch(items, {
    start: 'top 85%',
    once: true,
    onEnter: (batch) =>
      batch.forEach((el, i) => {
        const type = (el as HTMLElement).dataset.reveal || 'up';
        gsap.fromTo(el, { autoAlpha: 0, ...FROM[type] }, {
          autoAlpha: 1, y: 0, scale: 1, clipPath: 'inset(0 0 0% 0)',
          duration: 1, delay: i * 0.08, clearProps: 'transform,clipPath',
        });
      }),
  });
}
