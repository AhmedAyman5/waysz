/**
 * Events page — "under one roof" (views/events/Roof.astro). Wide screens: sticky + scrubbed, not a pin.
 * The four beams of the act `gala` leave the four corners of the hall and meet on the stage (`gala.beams`), which
 * lights up; each corner label arrives with its beam. css tier: the SVG lines from the labels draw to the meeting
 * point instead. Small screens: the same beams while the section passes; the labels sit in a grid under the text.
 * The beams go out again at the end of the section, so the hall is calm for the next one.
 * Set up only when the section comes near (motion/near.ts): nothing of it runs during page load.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { whenNear } from '../near';
import { gala } from '../stage/bridge';

const clamp01 = gsap.utils.clamp(0, 1);
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

const scene: Scene = (root) => {
  whenNear(root, () => {
    const q = gsap.utils.selector(root);
    const beams = q('.groof__beam') as HTMLElement[];
    const lines = q('.groof__lines path');
    const mm = gsap.matchMedia();
    mm.add({ wide: '(min-width: 1024px)', small: '(max-width: 1023px)' }, (ctx) => {
      const wide = ctx.conditions!.wide;
      const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
      beams.forEach((el, i) => tl.fromTo(el, { opacity: 0, y: (i < 2 ? -24 : 24) }, { opacity: 1, y: 0, duration: 0.08 }, 0.08 + i * 0.07));
      if (wide) tl.fromTo(lines, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.3, stagger: 0.05 }, 0.12);
      tl.set({}, {}, 1);
      ScrollTrigger.create({
        trigger: root, start: wide ? 'top top' : 'top 75%', end: wide ? 'bottom bottom' : 'bottom 30%', scrub: 0.4, animation: tl,
        onUpdate: (self) => { gala.beams = span(self.progress, 0.12, 0.55) * (1 - span(self.progress, 0.9, 1)); },
        onLeave: () => { gala.beams = 0; },
        onLeaveBack: () => { gala.beams = 0; },
      });
      return () => { gala.beams = 0; };
    });

    const title = root.querySelector<HTMLElement>('.groof__title')!;
    const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
    gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 55%', once: true } })
      .fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.2, stagger: 0.07 })
      .fromTo(q('.groof__text'), { y: 24 }, { y: 0, duration: 1 }, 0.3);
  });
};
export default scene;
