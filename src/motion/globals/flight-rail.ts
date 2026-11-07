import { gsap } from 'gsap';
import type { MotionEnv } from '../index';

/** Desktop replacement for the hidden scrollbar: a small plane travels down a thin rail. */
export function initFlightRail(env: MotionEnv) {
  const rail = document.querySelector<HTMLElement>('.flight-rail');
  if (!rail) return;
  if (!env.desktop || env.reduce) { rail.remove(); return; }
  const plane = rail.querySelector<HTMLElement>('.flight-rail__plane')!;
  gsap.to(plane, {
    y: () => rail.clientHeight - plane.offsetHeight,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.3, invalidateOnRefresh: true },
  });
}
