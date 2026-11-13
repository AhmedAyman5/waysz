/**
 * Expanding media — Home §1.4 (views/home/Why.astro) · reusable: About §4.1.
 * `.reveal__media` opens from a rounded "cabin window" to the full screen while `.reveal__text` travels from
 * the middle of the window to its place; then `.reason` items arrive, each icon with its own movement.
 * CSS sticky holds the screen (not a pin). Wide + tall screens: everything in one sticky screen, scrubbed.
 * Small screens: the reveal is scrubbed, the items enter as they scroll over the held photo.
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';

/** One icon = one timeline of length 1 (strokes draw, then the moving part settles). */
function iconTimeline(item: HTMLElement, dir: number) {
  const q = gsap.utils.selector(item);
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
  const origin = { transformOrigin: '50% 50%' };
  tl.fromTo(q('.s'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.7, stagger: 0.08, ease: 'power1.inOut' }, 0);
  switch (item.dataset.icon) {
    case 'roof':
      tl.fromTo(q('.i-roof'), { y: -9 }, { y: 0, duration: 0.6 }, 0)
        .fromTo(q('.i-dot'), { scale: 0, ...origin }, { scale: 1, duration: 0.3, stagger: 0.1 }, 0.45);
      break;
    case 'clarity':
      tl.fromTo(q('.i-check'), { scale: 0.4, ...origin }, { scale: 1, duration: 0.35 }, 0.65);
      break;
    case 'team':
      tl.fromTo(q('.i-spark'), { rotation: -90 * dir, scale: 0, ...origin }, { rotation: 0, scale: 1, duration: 0.5 }, 0.5);
      break;
    case 'lock':
      tl.fromTo(q('.i-shackle'), { y: -7, rotation: 24, transformOrigin: '100% 100%' }, { y: 0, rotation: 0, duration: 0.45, ease: 'power3.in' }, 0.45)
        .fromTo(q('.i-dot'), { scale: 0, ...origin }, { scale: 1, duration: 0.2 }, 0.8);
      break;
    case 'globe':
      tl.fromTo(q('.i-meridian'), { scaleX: 2.28, ...origin }, { scaleX: 1, duration: 1, ease: 'power1.inOut' }, 0);
      break;
    case 'rings':
      tl.fromTo(q('.i-ring-a'), { x: -9 }, { x: 0, duration: 0.8 }, 0.1)
        .fromTo(q('.i-ring-b'), { x: 9 }, { x: 0, duration: 0.8 }, 0.1);
      break;
  }
  return tl.set({}, {}, 1);
}

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const q = gsap.utils.selector(root);
  const track = root.querySelector<HTMLElement>('.why__track') ?? root;
  const view = root.querySelector<HTMLElement>('.why__view') ?? root;
  const text = root.querySelector<HTMLElement>('.reveal__text');
  const items = gsap.utils.toArray<HTMLElement>('.reason', root);
  root.classList.add('is-scrub');
  const words = text ? SplitText.create(text, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words : [];

  // the text starts in the middle of the window and travels to its place (measured without transforms)
  const toCenter = () => {
    if (!text) return { x: 0, y: 0 };
    let x = text.offsetLeft + text.offsetWidth / 2, y = text.offsetTop + text.offsetHeight / 2;
    for (let p = text.offsetParent as HTMLElement | null; p && p !== view; p = p.offsetParent as HTMLElement | null) { x += p.offsetLeft; y += p.offsetTop; }
    return { x: view.clientWidth / 2 - x, y: view.clientHeight / 2 - y };
  };

  gsap.matchMedia().add(
    { wide: '(min-width: 1024px) and (min-height: 680px)', small: '(max-width: 1023px), (max-height: 679px)' },
    (ctx) => {
      const { wide } = ctx.conditions!;
      root.classList.toggle('is-wide', !!wide);
      const from = wide ? 'inset(17% 35% 17% 35% round 190px)' : 'inset(24% 16% 30% 16% round 110px)';
      const open = wide ? 0.34 : 1;                          // share of the timeline used by the reveal

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: track, start: 'top top', scrub: 0.6, invalidateOnRefresh: true,
          end: wide ? 'bottom bottom' : () => `+=${window.innerHeight * 0.85}`,
        },
      });
      tl.fromTo(q('.reveal__media'), { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: open, ease: 'power2.inOut' }, 0)
        .fromTo(q('.reveal__inner'), { scale: 1.3 }, { scale: 1, duration: open, ease: 'power1.out' }, 0)
        .fromTo(q('.why__shade'), { opacity: 0 }, { opacity: 1, duration: open * 0.45 }, open * 0.6);
      if (text) {
        tl.fromTo(text, { x: () => toCenter().x, y: () => toCenter().y, scale: wide ? 1.25 : 1.1 },
          { x: 0, y: 0, scale: 1, duration: open * 0.75, ease: 'power2.inOut' }, open * 0.25);
        // the words rise once, as the section arrives (not scrubbed: readable at once)
        gsap.fromTo(words, { yPercent: 118 }, {
          yPercent: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out',
          scrollTrigger: { trigger: root, start: 'top 55%', once: true },
        });
      }

      if (wide) {
        items.forEach((item, i) => {
          const at = 0.42 + i * 0.082;
          tl.fromTo(item, { opacity: 0, y: 56 }, { opacity: 1, y: 0, duration: 0.1, ease: 'power2.out' }, at)
            .add(iconTimeline(item, env.dir).duration(0.16), at + 0.02);
        });
        tl.set({}, {}, 1);
      } else {
        // the heading makes room as the first reason comes up over the photo
        if (text && items[0]) gsap.fromTo(text.parentElement, { opacity: 1 }, {
          opacity: 0, ease: 'none', immediateRender: false,
          scrollTrigger: { trigger: items[0], start: 'top 62%', end: 'top 34%', scrub: true },
        });
        items.forEach((item) => {
          const icon = iconTimeline(item, env.dir).duration(1.3).pause(0);
          gsap.fromTo(item, { opacity: 0, y: 40 }, {
            opacity: 1, y: 0, duration: 0.9,
            scrollTrigger: { trigger: item, start: 'top 84%', once: true, onEnter: () => icon.play() },
          });
        });
      }
      return () => root.classList.remove('is-wide');
    },
  );
};
export default scene;
