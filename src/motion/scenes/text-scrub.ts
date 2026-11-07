/** S10 · A big statement lights up word by word as you scroll. Markup: <p class="statement">. */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const statement = root.querySelector<HTMLElement>('.statement');
  if (!statement) return;
  const split = SplitText.create(statement, { type: 'words', aria: 'auto' });
  gsap.fromTo(split.words, { opacity: 0.15 }, {
    opacity: 1, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: root, start: 'top 75%', end: 'bottom 45%', scrub: true },
  });
};
export default scene;
