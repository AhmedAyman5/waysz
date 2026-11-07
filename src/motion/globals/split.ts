import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import type { MotionEnv } from '../index';
import { isFree } from './util';

/** data-split="words|lines" — headline words/lines rise from a mask. NEVER chars (breaks Arabic). */
export function initSplit(env: MotionEnv) {
  gsap.utils.toArray<HTMLElement>('[data-split]').filter(isFree).forEach((el) => {
    if (env.reduce) { gsap.set(el, { autoAlpha: 1 }); return; }
    const type = el.dataset.split === 'lines' ? 'lines' : 'words';
    SplitText.create(el, {
      type,
      mask: type,
      aria: 'auto',
      autoSplit: true,
      onSplit(self) {
        gsap.set(el, { autoAlpha: 1 });
        return gsap.from(self[type], {
          yPercent: 110,
          duration: 1.1,
          stagger: 0.06,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        });
      },
    });
  });
}
