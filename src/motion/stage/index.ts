/**
 * Entry of the 3D layer — ONE stage (renderer + canvas) per page, shared by every act.
 * getStage() waits for the visitor's FIRST INTERACTION (pointer move, touch, wheel, key, scroll) before
 * loading three.js in a separate chunk: parsing three and compiling shaders is the heaviest work on the
 * page, and this keeps it out of the loading phase (LCP, blocking time). Until then — and on the css tier,
 * with reduced motion, or if WebGL fails — every section shows its DOM version, which is always complete.
 *   startFlightStage(env)            Home §1.2 + §1.2b (called by the hero once its text is on screen)
 *   addAct(env, (stage) => act)      any other section: registers its act when the stage exists
 */
import type { MotionEnv } from '../index';
import type { Act, Quality, Stage } from './stage';
import { setStageLive } from './bridge';

const EVENTS = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'keydown', 'scroll'] as const;
const firstInteraction = () =>
  new Promise<void>((resolve) => {
    if (window.scrollY > 0) { resolve(); return; }
    const done = () => { EVENTS.forEach((e) => window.removeEventListener(e, done)); resolve(); };
    EVENTS.forEach((e) => window.addEventListener(e, done, { passive: true }));
  });

let pending: Promise<Stage | null> | null = null;

/** The page's stage, or null when this visit runs without WebGL. */
export function getStage(env: MotionEnv): Promise<Stage | null> {
  if (env.tier === 'css' || env.reduce) return Promise.resolve(null);
  pending ??= (async () => {
    await firstInteraction();
    try {
      const { Stage } = await import('./stage');
      return new Stage(env.tier as Quality, () => {
        // too slow / context lost → every section falls back to its DOM version for the rest of the visit
        env.tier = 'css';
        document.documentElement.dataset.tier = 'css';
        pending = Promise.resolve(null);
        document.querySelector('[data-flight]')?.classList.remove('is-live');
        setStageLive(false);
      });
    } catch (err) {
      console.warn('[stage] WebGL unavailable, using the DOM version', err);
      return null;
    }
  })();
  return pending;
}

/** Register a section's act. `create` runs only if the stage exists; a failing act never breaks the page. */
export async function addAct(env: MotionEnv, create: () => Promise<Act>) {
  const stage = await getStage(env);
  if (!stage) return;
  try { stage.add(await create()); }
  catch (err) { console.warn('[stage] act failed, using the DOM version', err); }
}

export async function startFlightStage(env: MotionEnv) {
  const root = document.querySelector<HTMLElement>('[data-flight]');
  const host = root?.querySelector<HTMLElement>('.flight__stage');
  const video = root?.querySelector<HTMLVideoElement>('video[data-bgvideo]');
  if (!root || !host || !video) return;
  const stage = await getStage(env);
  if (!stage) return;
  try {
    const { createFlightAct } = await import('./acts/flight');
    stage.add(createFlightAct(host, video, env.desktop));
    // hand over from the DOM media to the canvas once it has drawn its first frame (CSS cross-fades)
    const check = new MutationObserver(() => {
      if (!stage.canvas.classList.contains('is-on')) return;
      check.disconnect();
      root.classList.add('is-live');
      setStageLive(true);
    });
    check.observe(stage.canvas, { attributes: true, attributeFilter: ['class'] });
  } catch (err) {
    console.warn('[stage] flight act failed, using the DOM version', err);
  }
}
