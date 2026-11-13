import { gsap } from 'gsap';

/**
 * Plane cursor (CursorPlane.astro). Desktop + fine pointer + motion allowed only (called from globals).
 * Follows the pointer, turns toward the direction of travel, grows on links/buttons,
 * shows a label on [data-cursor="…"]. Text fields keep the native caret.
 */
export function initCursor() {
  const el = document.querySelector<HTMLElement>('.cursor');
  if (!el) return;
  const plane = el.querySelector<HTMLElement>('.cursor__plane')!;
  const label = el.querySelector<HTMLElement>('.cursor__label')!;
  const html = document.documentElement;

  gsap.set(el, { xPercent: -50, yPercent: -50 });
  const xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });
  const rTo = gsap.quickTo(plane, 'rotation', { duration: 0.5, ease: 'power3.out' });

  let px = 0, py = 0, angle = 0, seen = false;
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!seen) {
      seen = true;
      px = e.clientX; py = e.clientY;
      gsap.set(el, { x: px, y: py });
      html.classList.add('has-cursor');
    }
    const dx = e.clientX - px, dy = e.clientY - py;
    if (dx * dx + dy * dy > 36) {                        // ignore jitter; keep the last angle when still
      const target = Math.atan2(dy, dx) * (180 / Math.PI);
      angle += ((target - angle + 540) % 360) - 180;     // shortest way round
      rTo(angle);
      px = e.clientX; py = e.clientY;
    }
    xTo(e.clientX); yTo(e.clientY);
    el.classList.remove('is-out');
  }, { passive: true });

  document.addEventListener('pointerover', (e) => {
    const t = e.target as Element;
    const hot = t.closest<HTMLElement>('a, button, [data-cursor]');
    const text = t.closest('input, textarea, select, [contenteditable]');
    el.classList.toggle('is-hot', !!hot && !text);
    el.classList.toggle('is-text', !!text);
    const tip = hot?.closest<HTMLElement>('[data-cursor]')?.dataset.cursor ?? '';
    label.textContent = tip;
    el.classList.toggle('has-label', !!tip);
  });
  html.addEventListener('pointerleave', () => el.classList.add('is-out'));
}
