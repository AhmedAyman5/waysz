/**
 * Services page — «جهة واحدة تنسّق كل شيء» (views/services/Unite.astro). CSS sticky screen + one scrubbed trigger
 * (not a pin). Its progress is `sky.unite`: each part of the sentence lights up (`.is-on`, opacity only) exactly when
 * the act draws the arc from that part's constellation (UNITE in stage/bridge.ts), and the closing line when the ring
 * closes around the centre star. The heading rises by words once. Reversible: scrolling back dims them again.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { sky, UNITE } from '../stage/bridge';
import { whenNear } from '../near';

// far below the fold: its trigger and SplitText are set up only when the visitor gets near (blocking time)
const scene: Scene = (root) => whenNear(root, () => {
  const items = gsap.utils.toArray<HTMLElement>('.unite__item', root);
  const close = root.querySelector<HTMLElement>('.unite__close');
  const title = root.querySelector<HTMLElement>('.unite__title')!;

  let state = -1;
  const set = (p: number) => {
    sky.unite = p;
    const n = UNITE.at.filter((at) => p >= at + UNITE.span * 0.35).length + (p >= UNITE.final + 0.06 ? 1 : 0);
    if (n === state) return;
    state = n;
    items.forEach((el, i) => el.classList.toggle('is-on', i < n));
    close?.classList.toggle('is-on', n > items.length);
  };
  ScrollTrigger.create({
    trigger: root, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => set(self.progress),
    onLeaveBack: () => set(0),
  });

  document.fonts.ready.then(() => {
    const split = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w' });
    gsap.fromTo(split.words, { yPercent: 110 }, {
      yPercent: 0, duration: 1.2, stagger: 0.06,
      scrollTrigger: { trigger: root, start: 'top 70%', toggleActions: 'play none none reverse' },
    });
  });
});
export default scene;
