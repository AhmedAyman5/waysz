import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionEnv } from '../index';

/**
 * Flight progress. Desktop: a small plane travels down a thin rail (replaces the hidden scrollbar),
 * with one tick per [data-waypoint] section. Touch / small screens: a 2px line at the top edge.
 */
export function initFlightRail(env: MotionEnv) {
  const rail = document.querySelector<HTMLElement>('.flight-rail');
  const bar = document.querySelector<HTMLElement>('.flight-bar');
  if (env.reduce) { rail?.remove(); bar?.remove(); return; }

  if (!env.desktop) {
    rail?.remove();
    if (bar) gsap.fromTo(bar, { scaleX: 0 }, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
    });
    return;
  }
  bar?.remove();
  if (!rail) return;

  const plane = rail.querySelector<HTMLElement>('.flight-rail__plane')!;
  gsap.to(plane, {
    y: () => rail.clientHeight - plane.offsetHeight,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.3, invalidateOnRefresh: true },
  });

  // waypoints: where each marked section starts, as a fraction of the whole scroll
  const points = gsap.utils.toArray<HTMLElement>('[data-waypoint]');
  const ticks = points.map(() => {
    const t = document.createElement('span');
    t.className = 'flight-rail__tick';
    rail.append(t);
    return t;
  });
  const place = () => {
    const max = ScrollTrigger.maxScroll(window) || 1;
    points.forEach((p, i) => {
      const st = ScrollTrigger.create({ trigger: p, start: 'top top' });   // pin-aware position
      ticks[i].style.top = `${gsap.utils.clamp(0, 100, (st.start / max) * 100)}%`;
      st.kill();
    });
  };
  ScrollTrigger.addEventListener('refreshInit', () => ticks.forEach((t) => (t.style.top = '')));
  ScrollTrigger.addEventListener('refresh', place);
}
