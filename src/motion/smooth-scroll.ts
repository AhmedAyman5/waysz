import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Live binding: undefined until initSmoothScroll() runs (and stays undefined on reduced motion). */
export let lenis: Lenis | undefined;

export function initSmoothScroll() {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis!.raf(time * 1000));   // one RAF loop for everything
  gsap.ticker.lagSmoothing(0);
}
