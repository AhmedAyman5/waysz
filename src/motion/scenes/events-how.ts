/**
 * Events page — who we serve + how we work (views/events/How.astro). No pin.
 * The four audience tickets arrive once (a small tilt, like a ticket handed over). The line under the four steps
 * fills with the scroll — horizontal on wide screens, growing from the reading side; vertical on small ones — and a
 * step gets `.is-active` when the line reaches it. Waiting steps are dimmed to 0.66 (still AA). Reversible.
 * Set up only when the section comes near (motion/near.ts): nothing of it runs during page load.
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { whenNear } from '../near';

const scene: Scene = (root, env) => {
  whenNear(root, () => {
    const q = gsap.utils.selector(root);
    gsap.utils.toArray<HTMLElement>('.ghow__title', root).forEach((title) => {
      const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
      gsap.fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.2, stagger: 0.08, scrollTrigger: { trigger: title, start: 'top 82%', once: true } });
    });
    gsap.fromTo(q('.ticket'), { opacity: 0, y: 40, rotation: -3 * env.dir }, {
      opacity: 1, y: 0, rotation: 0, duration: 1.1, stagger: 0.1,
      scrollTrigger: { trigger: q('.ghow__who')[0], start: 'top 80%', once: true },
    });

    const steps = q('.gstep') as HTMLElement[];
    const fill = q('.ghow__fill')[0];
    gsap.matchMedia().add({ wide: '(min-width: 1024px)', small: '(max-width: 1023px)' }, (ctx) => {
      const wide = ctx.conditions!.wide;
      gsap.fromTo(fill, wide ? { scaleX: 0, scaleY: 1 } : { scaleY: 0, scaleX: 1 }, {
        ...(wide ? { scaleX: 1 } : { scaleY: 1 }), ease: 'none',
        scrollTrigger: {
          trigger: q('.ghow__route')[0], start: 'top 75%', end: wide ? 'top 25%' : 'bottom 55%', scrub: 0.5,
          onUpdate: (self) => steps.forEach((s, i) => s.classList.toggle('is-active', self.progress >= (wide ? i / steps.length : i / (steps.length - 0.4)) - 0.001)),
        },
      });
    });
  });
};
export default scene;
