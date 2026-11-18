/**
 * Legal page — FAQ (views/legal/Faq.astro), next to the `accordion` scene that opens and closes the rows.
 * Closed answers hold a link, so they are made `inert` here (with JS only: without it every answer is open).
 * Once in view: the heading rises by words and the rows arrive one after another.
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';

const scene: Scene = (root) => {
  root.querySelectorAll('.faq__panel').forEach((panel) => panel.setAttribute('inert', ''));
  const title = root.querySelector<HTMLElement>('.lfaq__title')!;
  const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 62%', once: true } })
    .fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.1, stagger: 0.08 })
    .fromTo(root.querySelectorAll('.faq__item'), { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07 }, 0.2);
};
export default scene;
