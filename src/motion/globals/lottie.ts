import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * <Lottie src mode="loop|once|hover|scrub"> — lottie-web (light SVG build) is imported only when a
 * [data-lottie] comes within one viewport. Every visitor gets the playback (quality policy).
 */
export function initLottie() {
  const items = document.querySelectorAll<HTMLElement>('[data-lottie]');
  if (!items.length) return;

  const mount = async (el: HTMLElement) => {
    const { default: lottie } = await import('lottie-web/build/player/lottie_light');
    const mode = el.dataset.mode || 'loop';
    const anim = lottie.loadAnimation({
      container: el,
      renderer: 'svg',
      path: el.dataset.lottie!,
      loop: mode === 'loop',
      autoplay: false,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    });
    anim.addEventListener('DOMLoaded', () => {
      el.classList.add('is-loaded');
      const last = anim.totalFrames - 1;
      if (mode === 'scrub') {
        ScrollTrigger.create({
          trigger: el, start: 'top bottom', end: 'bottom top',
          onUpdate: (self) => anim.goToAndStop(self.progress * last, true),
        });
      } else if (mode === 'hover') {
        const host = el.closest<HTMLElement>('a, button') ?? el;
        host.addEventListener('pointerenter', () => anim.goToAndPlay(0, true));
      } else {
        // loop / once: play only while on screen
        new IntersectionObserver(([e]) => {
          if (e.isIntersecting) anim.play();
          else if (mode === 'loop') anim.pause();
        }, { threshold: 0.2 }).observe(el);
      }
    });
  };

  const near = new IntersectionObserver((entries, io) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      mount(e.target as HTMLElement).catch((err) => console.warn('[lottie]', err));
    }
  }, { rootMargin: '100% 0px' });
  items.forEach((el) => near.observe(el));
}
