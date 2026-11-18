/**
 * Quality policy (client decision — see CLAUDE.md "Quality policy"):
 * every visitor gets the same full experience at the highest quality. There are NO capability tiers:
 * no checks of cores, memory, GPU name, screen size, saveData or prefers-reduced-motion.
 *   full  the browser can create a WebGL2 context (three.js needs WebGL2) → the full 3D scene on every page
 *   css   WebGL2 is unavailable (or the context is lost later): posters / stills instead of the canvas.
 *         Every GSAP / ScrollTrigger animation, Lenis, the cursor and all scroll scenes still run.
 * Smoothness is protected only by the stage's dynamic render scale (stage.ts), never by drawing less.
 * Dev only: force a tier with ?tier=full|css.
 */
export type Tier = 'full' | 'css';

export function detectTier(): Tier {
  if (import.meta.env.DEV) {
    const forced = new URLSearchParams(location.search).get('tier');
    if (forced === 'full' || forced === 'css') return forced;
  }
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'css';
    gl.getExtension('WEBGL_lose_context')?.loseContext();   // free the probe context right away
    return 'full';
  } catch {
    return 'css';
  }
}
