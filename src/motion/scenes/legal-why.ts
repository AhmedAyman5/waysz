/**
 * Legal page — «لماذا WaysZ؟» (views/legal/Why.astro). No pin, no sticky.
 * Once in view: the heading rises by words, the four reasons arrive one after another while their icons draw,
 * and the sealed file settles from a tilt. The pointer's light on the file is CSS (data-spotlight → --mx / --my).
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const q = gsap.utils.selector(root);
  const title = root.querySelector<HTMLElement>('.lwhy__title')!;
  const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.set(q('.lreason__icon > *'), { drawSVG: '0%' });
  gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 58%', once: true } })
    .fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.1, stagger: 0.08 })
    .fromTo(q('.lreason'), { opacity: 0, y: 44 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 }, 0.25)
    .to(q('.lreason__icon > *'), { drawSVG: '100%', duration: 1.1, stagger: 0.05, ease: 'power2.inOut' }, 0.35)
    .fromTo(q('.lwhy__file'), { opacity: 0, y: 70, rotation: 7 * env.dir }, { opacity: 1, y: 0, rotation: 0, duration: 1.3 }, 0.3);
};
export default scene;
