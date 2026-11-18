/**
 * Runs `setup` once, when `el` comes within `margin` of the viewport (IntersectionObserver: no scroll listener).
 * For scenes far below the fold: their ScrollTriggers, SplitText and DOM work then happen one section at a time
 * while the visitor scrolls, instead of all together during page load (blocking time). A link that jumps straight
 * to the section still runs it at once.
 */
export function whenNear(el: Element, setup: () => void, margin = '150%') {
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    setup();
  }, { rootMargin: `${margin} 0px ${margin} 0px` });
  io.observe(el);
}
