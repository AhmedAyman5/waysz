/**
 * Software page — the closing box (views/software/Missing.astro). Once, when it comes into view: the box
 * settles, its decorative line of code types itself in (ScrambleText — Latin only) and the heading rises by words.
 */
import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';

gsap.registerPlugin(ScrambleTextPlugin);

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const q = gsap.utils.selector(root);
  const code = root.querySelector<HTMLElement>('.ask__code')!;
  const text = code.textContent ?? '';
  const words = SplitText.create(q('.ask__title'), { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.set(code, { opacity: 0 });
  gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 68%', once: true } })
    .fromTo(q('.ask__box'), { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1 })
    .set(code, { opacity: 1 }, 0.25)
    .fromTo(code, { scrambleText: { text: ' ', chars: ' ' } }, { duration: 1.3, ease: 'none', scrambleText: { text, chars: '{}()<>=/;.?', speed: 0.5 } }, 0.25)
    .fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.1, stagger: 0.06 }, 0.3)
    .fromTo(q('.ask__text, .ask__btn'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 }, 0.6)
    .fromTo(q('.ask__corner'), { scale: 0 }, { scale: 1, duration: 0.8, stagger: 0.15, ease: 'back.out(2)' }, 0.5);
};
export default scene;
