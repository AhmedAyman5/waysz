/**
 * Home §1.2 Hero — "In the sky".
 * Entrance (after the intro): headline words rise from a mask, lead and buttons follow, then the
 * WebGL stage starts. Scroll (sticky, not pinned): the camera pushes into the clouds until white-out.
 * The same scroll drives the WebGL stage (through stage/bridge) and the CSS fallback layers.
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { introDone } from '../config';
import { flight } from '../stage/bridge';
import { startFlightStage } from '../stage';

const smooth = (a: number, b: number, x: number) => {
  const t = gsap.utils.clamp(0, 1, (x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const scene: Scene = async (root, env) => {
  const q = gsap.utils.selector(root);
  const content = q('[data-intro]');
  if (env.reduce) { gsap.set(content, { autoAlpha: 1 }); return; }

  // CSS tier only: the cloud photo layers (the WebGL tiers draw clouds in the shader)
  if (env.tier === 'css') {
    root.querySelectorAll<HTMLImageElement>('img[data-src]').forEach((img) => { img.src = img.dataset.src!; });
  }

  // ---------- entrance ----------
  const split = SplitText.create(root.querySelector<HTMLElement>('.hero__title')!, {
    type: 'words', mask: 'words', wordsClass: 'hero__word', aria: 'auto',     // words only — never chars (Arabic)
  });
  const followers = q('.hero__lead, .hero__actions > *, .hero__cue');
  gsap.set(split.words, { yPercent: 118 });
  gsap.set(followers, { autoAlpha: 0, y: 28 });
  gsap.set(content, { autoAlpha: 1 });

  // ---------- scroll: camera push ----------
  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.5,   // = the sticky range
      onUpdate: (self) => {
        flight.push = self.progress;
        if (!flight.mix) { flight.veil = smooth(0.45, 0.97, self.progress); flight.veilPage = 0; }
      },
    },
  })
    .to(q('.hero__text'), { y: -90, autoAlpha: 0, duration: 0.3 }, 0)
    .to(q('.hero__scrim'), { autoAlpha: 0, duration: 0.35 }, 0.25)
    // CSS tier (ignored visually on the WebGL tiers: these layers are hidden there)
    .to(q('.hero__plate'), { scale: 1.22, duration: 1 }, 0)
    .to(q('.hero__cloud--far'), { scale: 2.1, duration: 1 }, 0)
    .to(q('.hero__cloud--near'), { scale: 3.4, yPercent: -18, duration: 1 }, 0)
    .to(q('.hero__veil'), { autoAlpha: 1, duration: 0.5 }, 0.47)
    .set({}, {}, 1);

  await introDone();
  gsap.timeline({ delay: 0.15 })
    .to(split.words, { yPercent: 0, duration: 1.3, stagger: 0.07 })
    .to(followers, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1 }, '-=0.9')
    .add(() => { void startFlightStage(env); }, 0.8);       // after the LCP: text is on screen
};
export default scene;
