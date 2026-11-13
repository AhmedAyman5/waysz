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
  const title = root.querySelector<HTMLElement>('.hero__title')!;
  if (env.reduce) { gsap.set(title, { autoAlpha: 1 }); return; }

  // ---------- entrance ----------
  // Lead + buttons are never hidden (they are the LCP). On a first visit they wait a few px lower under
  // the intro curtain and settle as it lifts; the headline words rise from a mask.
  const firstVisit = !!document.querySelector('[data-scene~="preloader"]')
    && !document.documentElement.classList.contains('intro-seen');
  const split = SplitText.create(title, {
    type: 'words', mask: 'words', wordsClass: 'hero__word', aria: 'auto',     // words only — never chars (Arabic)
  });
  const followers = q('.hero__lead, .hero__actions > *');
  gsap.set(split.words, { yPercent: 118 });
  if (firstVisit) gsap.set(followers, { y: 28 });
  gsap.set(title, { autoAlpha: 1 });

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
  const tl = gsap.timeline({ delay: 0.15 }).to(split.words, { yPercent: 0, duration: 1.3, stagger: 0.07 });
  if (firstVisit) tl.to(followers, { y: 0, duration: 0.9, stagger: 0.1 }, 0.3);
  // After the LCP (text is on screen): start the WebGL stage — or, on the css tier, fetch the cloud
  // photo layers (the WebGL tiers draw their clouds in the shader and never download them).
  tl.add(() => {
    if (env.tier === 'css') {
      // The cloud layers only matter once the camera pushes in, so they wait for the first interaction —
      // loaded during page load they would be measured as the (late) largest paint on weak devices.
      const events = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'keydown', 'scroll'] as const;
      const load = () => {
        events.forEach((e) => window.removeEventListener(e, load));
        root.querySelectorAll<HTMLImageElement>('img[data-src]').forEach((img) => { img.src = img.dataset.src!; });
      };
      if (window.scrollY > 0) load();
      else events.forEach((e) => window.addEventListener(e, load, { passive: true }));
    } else void startFlightStage(env);
  }, 0.8);
};
export default scene;
