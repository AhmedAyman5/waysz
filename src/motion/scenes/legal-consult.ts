/**
 * Legal page — the consultation call (views/legal/Consult.astro). No pin.
 * The headline rises by words, the text and the buttons follow. The balance itself is the thread's work:
 * scenes/legal-thread.ts drops the last weight when this section arrives.
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';

const scene: Scene = (root) => {
  const q = gsap.utils.selector(root);
  const title = root.querySelector<HTMLElement>('.lcta__title')!;
  const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 50%', once: true } })
    .fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.2, stagger: 0.07 })
    .fromTo(q('.lcta__text'), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.9 }, 0.35)
    .fromTo(q('.lcta__actions'), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.9 }, 0.5);
};
export default scene;
