/**
 * WaysZ motion — the ONLY entry point. Called once per page by BaseLayout.
 * Rules and API: .claude/skills/waysz-motion/SKILL.md
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Flip } from 'gsap/Flip';
import { CustomEase } from 'gsap/CustomEase';
import { initSmoothScroll } from './smooth-scroll';
import { initGlobals } from './globals';
import { detectTier, type Tier } from './stage/tier';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin, Flip, CustomEase);
gsap.defaults({ ease: 'expo.out', duration: 0.9 });

export type MotionEnv = {
  reduce: boolean;   // user asked for reduced motion
  rtl: boolean;
  dir: 1 | -1;       // multiply every "forward" horizontal value by this
  desktop: boolean;  // ≥1024px AND a precise pointer (mouse/trackpad)
  tier: Tier;        // high · lite · css — by device capability (see stage/tier.ts); may drop at runtime
};
export type Scene = (root: HTMLElement, env: MotionEnv) => void | Promise<void>;

const scenes = import.meta.glob<{ default: Scene }>('./scenes/*.ts');

export async function initMotion() {
  const html = document.documentElement;
  const rtl = html.dir === 'rtl';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = matchMedia('(min-width: 1024px) and (pointer: fine)').matches;
  const env: MotionEnv = { reduce, rtl, dir: rtl ? -1 : 1, desktop, tier: detectTier(reduce, desktop) };
  html.dataset.tier = env.tier;

  if (!env.reduce) initSmoothScroll();
  initGlobals(env);

  // Scenes load in DOM order (matters for pinned sections). One failing scene never blocks the rest.
  for (const el of document.querySelectorAll<HTMLElement>('[data-scene]')) {
    for (const name of (el.dataset.scene ?? '').split(/\s+/).filter(Boolean)) {
      const load = scenes[`./scenes/${name}.ts`];
      if (!load) { console.warn(`[motion] unknown scene: "${name}"`); continue; }
      try {
        const run = (await load()).default(el, env);
        if (run instanceof Promise) run.catch((err) => console.error(`[motion] ${name}`, err));
      } catch (err) {
        console.error(`[motion] ${name}`, err);
      }
    }
  }

  html.classList.add('motion-ready');
  await document.fonts.ready;
  ScrollTrigger.refresh();
}
