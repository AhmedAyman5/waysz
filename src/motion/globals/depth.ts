import { gsap } from 'gsap';

/**
 * Mouse depth layers (desktop only, called from globals).
 * <div data-depth-scene> … <img data-depth="0.3"> … </div> — each layer moves against the pointer × depth.
 * A scene root may carry data-depth-scene itself (the hero does).
 */
const RANGE = 40; // px at depth 1

export function initDepth() {
  document.querySelectorAll<HTMLElement>('[data-depth-scene]').forEach((scene) => {
    const layers = [...scene.querySelectorAll<HTMLElement>('[data-depth]')].map((el) => ({
      d: parseFloat(el.dataset.depth || '0.3'),
      x: gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3.out' }),
      y: gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3.out' }),
    }));
    if (!layers.length) return;
    scene.addEventListener('pointermove', (e) => {
      const r = scene.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      layers.forEach((l) => { l.x(-nx * l.d * RANGE); l.y(-ny * l.d * RANGE); });
    }, { passive: true });
    scene.addEventListener('pointerleave', () => layers.forEach((l) => { l.x(0); l.y(0); }));
  });
}
