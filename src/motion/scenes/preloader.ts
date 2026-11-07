/** S1 · "Take-off" preloader — first visit per session only, ~2s. */
import { gsap } from 'gsap';
import type { Scene } from '../index';
import { LOGO } from '../config';
import { lenis } from '../smooth-scroll';

const scene: Scene = (root, env) => {
  const html = document.documentElement;
  const finish = () => window.dispatchEvent(new Event('waysz:intro-done'));
  if (html.classList.contains('intro-seen') || env.reduce) { root.remove(); finish(); return; }
  try { sessionStorage.setItem('waysz-intro', '1'); } catch { /* private mode */ }
  lenis?.stop();

  const q = gsap.utils.selector(root);
  const plane = root.querySelector<SVGPathElement>('.mark-plane')!;
  const road = root.querySelector<SVGPathElement>('.mark-road')!;
  const trail = road.cloneNode() as SVGPathElement;      // visible "runway line" on the road
  trail.setAttribute('class', 'preloader__trail');
  road.after(trail);
  gsap.set(plane, { autoAlpha: 0 });

  gsap.timeline({ onComplete: () => { root.remove(); lenis?.start(); } })
    .from(q('.mark-wing-left'), { x: 50, autoAlpha: 0, duration: 0.6 })          // wings start closed…
    .from(q('.mark-wing-right'), { x: -50, autoAlpha: 0, duration: 0.6 }, '<')    // …and part: the road opens
    .fromTo(trail, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.8, ease: 'power2.inOut' }, '-=0.25')
    .set(plane, { autoAlpha: 1 }, '<')
    .to(plane, {
      duration: 0.8,
      ease: 'power2.inOut',
      motionPath: { path: road, align: road, alignOrigin: [0.5, 0.5], autoRotate: LOGO.planeHeading },
    }, '<')
    .to(plane, { x: 0, y: 0, rotation: 0, duration: 0.3, ease: 'power2.out' })    // settle in its logo spot
    .to(trail, { autoAlpha: 0, duration: 0.3 }, '<')
    .add(finish)                                                                   // hero starts under the curtain
    .to(root, { yPercent: -100, duration: 0.7, ease: 'expo.inOut' });
};
export default scene;
