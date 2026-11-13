/**
 * Entry of the 3D layer. Call startFlightStage() AFTER the hero is visible. It then waits for the visitor's
 * FIRST INTERACTION (pointer move, touch, wheel, key, scroll) before loading three.js + the act in a
 * separate chunk: parsing three and compiling shaders is the heaviest work on the page, and this keeps it
 * out of the loading phase (LCP, blocking time) — until then the hero is the plain video, which looks the
 * same at rest. On desktop that is the first mouse move; on a phone, the first touch.
 * Returns quietly on the css tier or if WebGL fails —
 * the DOM version (video, 2D canvas, CSS clouds) is always there underneath.
 */
import type { MotionEnv } from '../index';
import { setStageLive } from './bridge';

const EVENTS = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'keydown', 'scroll'] as const;
const firstInteraction = () =>
  new Promise<void>((resolve) => {
    if (window.scrollY > 0) { resolve(); return; }
    const done = () => { EVENTS.forEach((e) => window.removeEventListener(e, done)); resolve(); };
    EVENTS.forEach((e) => window.addEventListener(e, done, { passive: true }));
  });

export async function startFlightStage(env: MotionEnv) {
  if (env.tier === 'css' || env.reduce) return;
  const root = document.querySelector<HTMLElement>('[data-flight]');
  const host = root?.querySelector<HTMLElement>('.flight__stage');
  const video = root?.querySelector<HTMLVideoElement>('video[data-bgvideo]');
  if (!root || !host || !video) return;

  await firstInteraction();
  try {
    const [{ Stage }, { createFlightAct }] = await Promise.all([import('./stage'), import('./acts/flight')]);
    const stage = new Stage(env.tier, () => {
      // too slow / context lost → fall back to the DOM version for the rest of the visit
      env.tier = 'css';
      root.classList.remove('is-live');
      setStageLive(false);
    });
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
    console.warn('[stage] WebGL unavailable, using the DOM version', err);
  }
}
