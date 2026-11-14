/**
 * Software page — hero, "Code in flight" (views/software/Hero.astro). Sticky + scrubbed, not a pin.
 * Entrance: the characters of the code fly in from depth and land in their place (DOM spans, every tier —
 * the WebGL stage only loads on the first interaction); the headline rises by words. Lead and buttons are
 * never hidden (LCP).
 * Then, on the WebGL tiers, the act "glyphs" takes over the settled code (it lands one glyph on every DOM
 * character), adds the swarm in depth and the pointer field, and flies the code away as the hero scrolls.
 * css tier: the lines lift off as DOM elements. Either way scrolling back re-assembles the code.
 * The code is LTR in both languages: no horizontal value here is multiplied by env.dir.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { measureCode, splitChars } from '../code-glyphs';
import { code } from '../stage/bridge';
import { addAct } from '../stage';

const scene: Scene = (root, env) => {
  const q = gsap.utils.selector(root);
  const title = root.querySelector<HTMLElement>('.chero__title')!;
  const box = root.querySelector<HTMLElement>('.chero__codebox')!;
  const frame = root.querySelector<HTMLElement>('.chero__sticky')!;
  const host = root.querySelector<HTMLElement>('.chero__stage')!;
  if (env.reduce) { gsap.set([title, box], { autoAlpha: 1 }); return; }

  const wide = matchMedia('(min-width: 1024px)').matches;
  const rnd = gsap.utils.random;

  // ---------- entrance ----------
  const split = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' });   // words only (Arabic)
  // wide screens fly single characters; small ones fly whole tokens (fewer moving elements while the page loads)
  const pieces = wide ? splitChars(box) : gsap.utils.toArray<HTMLElement>('.t:not(.t-ws)', box);
  gsap.set([title, box], { autoAlpha: 1 });
  gsap.timeline({ delay: 0.15 })
    .fromTo(split.words, { yPercent: 118 }, { yPercent: 0, duration: 1.3, stagger: 0.08 })
    .fromTo(q('.chero__plate'), { scale: 1.1 }, { scale: 1, duration: 2.6, ease: 'power2.out' }, 0)
    .fromTo(pieces, {
      x: () => rnd(-520, 520), y: () => rnd(-380, 300), z: () => rnd(-900, 380),
      rotationX: () => rnd(-110, 110), rotationY: () => rnd(-110, 110), rotationZ: () => rnd(-60, 60), opacity: 0,
    }, {
      x: 0, y: 0, z: 0, rotationX: 0, rotationY: 0, rotationZ: 0, opacity: 1,
      duration: 1.7, ease: 'expo.out', stagger: { amount: 1.1, from: 'random' },
    }, 0.1)
    .call(() => { gsap.set(pieces, { clearProps: 'transform' }); code.settled = true; });

  // ---------- scroll: the code lifts off, the text leaves, the footage sinks into the night ----------
  const lines = gsap.utils.toArray<HTMLElement>('.ln', box);
  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.5,
      onUpdate: (self) => { code.leave = self.progress; },
    },
  })
    .to(q('.chero__content'), { y: -90, opacity: 0, duration: 0.3 }, 0.02)
    .to(lines, {
      y: (i) => -260 - i * 26, z: 420, rotationX: -64, rotationZ: (i) => (i % 2 ? 7 : -7), opacity: 0,
      duration: 0.5, ease: 'power1.in', stagger: 0.035,
    }, 0.06)
    .to(q('.chero__media'), { opacity: 0, duration: 0.45 }, 0.5)
    .set({}, {}, 1);

  // ---------- WebGL tiers: where every character sits, for the act ----------
  const style = getComputedStyle(frame);
  const measure = () => {
    const layout = measureCode(box, frame);
    if (!layout) return;
    code.layout = layout;
    code.plate = [parseFloat(style.getPropertyValue('--plate-top')) || 0, parseFloat(style.getPropertyValue('--plate-h')) || 1];
    code.version++;
  };
  measure();
  ScrollTrigger.addEventListener('refresh', measure);
  const video = root.querySelector<HTMLVideoElement>('video[data-bgvideo]')!;
  const poster = root.querySelector<HTMLImageElement>('.bgvideo__poster')!;
  void addAct(env, async () => (await import('../stage/acts/glyphs')).createGlyphAct(host, video, poster));
};
export default scene;
