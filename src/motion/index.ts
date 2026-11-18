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

/**
 * Quality policy (client decision, CLAUDE.md): every visitor gets the same full motion and 3D. There is no
 * reduced-motion, saveData or device-capability branch anywhere — do not add one.
 */
export type MotionEnv = {
  rtl: boolean;
  dir: 1 | -1;       // multiply every "forward" horizontal value by this
  desktop: boolean;  // ≥1024px AND a precise pointer (mouse/trackpad) — for pointer-driven effects only
  tier: Tier;        // full · css — css ONLY when WebGL2 is unavailable or the context is lost (stage/tier.ts)
};
export type Scene = (root: HTMLElement, env: MotionEnv) => void | Promise<void>;

const scenes = import.meta.glob<{ default: Scene }>('./scenes/*.ts');

export async function initMotion() {
  const html = document.documentElement;
  html.classList.add('motion-boot');   // the boot script's failsafe: this module did run (see BaseLayout)
  const rtl = html.dir === 'rtl';
  const desktop = matchMedia('(min-width: 1024px) and (pointer: fine)').matches;
  const env: MotionEnv = { rtl, dir: rtl ? -1 : 1, desktop, tier: detectTier() };
  html.dataset.tier = env.tier;

  try {
    initSmoothScroll();
    initGlobals(env);
  } catch (err) {
    // the globals reveal [data-reveal] / [data-split]: if they cannot run, show the plain (no-JS) page
    console.error('[motion] globals', err);
    html.classList.remove('js');
    return;
  }

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
