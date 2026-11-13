/**
 * Home §1.7 — the WaysZ Visa boarding pass (views/home/Visa.astro). No pin.
 * `.pass__scroll` tilts with the scroll, `.pass` leans toward the pointer (desktop) with a moving shine,
 * and the stamp lands once with a small impact.
 */
import { gsap } from 'gsap';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const q = gsap.utils.selector(root);
  const pass = root.querySelector<HTMLElement>('.pass')!;

  // scroll: the pass comes up flat like a card laid on a counter, then stands to face us
  gsap.fromTo(q('.gate__media'), { scale: 1.18 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
  });
  gsap.fromTo(q('.pass__scroll'), { rotationX: 46, y: 120, scale: 0.86, transformOrigin: '50% 100%' }, {
    rotationX: 0, y: 0, scale: 1, ease: 'none',
    scrollTrigger: { trigger: root, start: 'top 85%', end: 'top 12%', scrub: 0.6 },
  });

  // stamp
  gsap.set(q('.stamp'), { autoAlpha: 0 });
  gsap.timeline({ scrollTrigger: { trigger: pass, start: 'top 62%', once: true } })
    .fromTo(q('.pass__plane'), { x: -70 * env.dir, opacity: 0 }, { x: 0, opacity: 1, duration: 1.1 })
    .fromTo(q('.stamp'), { autoAlpha: 0, scale: 2.1, rotation: -26, transformOrigin: '50% 50%' },
      { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.32, ease: 'power4.in' }, 0.35)
    .fromTo(pass, { y: 0 }, { y: 5, duration: 0.07, repeat: 1, yoyo: true, ease: 'power1.out' }, '>')   // impact
    .fromTo(q('.pass__shine'), { xPercent: -45 * env.dir, opacity: 0.9 }, { xPercent: 45 * env.dir, opacity: 0, duration: 1.3, ease: 'power2.out' }, '<');

  // pointer: lean toward the mouse
  if (!env.desktop) return;
  gsap.set(pass, { transformPerspective: 1400 });
  const rx = gsap.quickTo(pass, 'rotationX', { duration: 0.7, ease: 'power3.out' });
  const ry = gsap.quickTo(pass, 'rotationY', { duration: 0.7, ease: 'power3.out' });
  root.addEventListener('pointermove', (e) => {
    const r = pass.getBoundingClientRect();
    const nx = gsap.utils.clamp(-1, 1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2));
    const ny = gsap.utils.clamp(-1, 1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2));
    ry(nx * 7); rx(-ny * 5);
  }, { passive: true });
  root.addEventListener('pointerleave', () => { rx(0); ry(0); });
};
export default scene;
