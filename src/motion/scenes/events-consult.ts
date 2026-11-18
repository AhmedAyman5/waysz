/**
 * Events page — the call (views/events/Consult.astro). Sticky + scrubbed, not a pin.
 * Its sticky progress is the finale (bridge `gala.final`): every spotlight of the act `gala` converges on the call,
 * then the curtain closes (0.1 → 0.9), and the applause flashes at the end. Scrolling back opens it again.
 * The text is never hidden: the headline's words only settle once, the buttons are magnetic (globals).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { gala } from '../stage/bridge';

const scene: Scene = (root) => {
  const q = gsap.utils.selector(root);
  const title = root.querySelector<HTMLElement>('.gcall__title')!;
  const words = SplitText.create(title, { type: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 55%', once: true } })
    .fromTo(words, { y: 40 }, { y: 0, duration: 1.3, stagger: 0.06 })
    .fromTo(q('.gcall__text, .gcall__actions'), { y: 24 }, { y: 0, duration: 1.1, stagger: 0.08 }, 0.2);

  ScrollTrigger.create({
    trigger: root, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => { gala.final = self.progress; },
    onLeaveBack: () => { gala.final = 0; },
  });
  gsap.fromTo(q('.gcall__pool'), { opacity: 0.6 }, {
    opacity: 1, ease: 'none',
    scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.4 },
  });
};
export default scene;
