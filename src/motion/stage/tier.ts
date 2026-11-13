/**
 * Quality tier — decided by what the DEVICE can do, never by "is it a phone".
 *   high  desktop-class GPU: full shader (3 cloud layers, god rays, 1.5 DPR)
 *   lite  capable phones / tablets / small laptops: same scene, cheaper shader (2 layers, no rays, 1–1.25 DPR)
 *   css   weak devices, no WebGL2, software GPU, saveData, reduced motion: plain video + CSS layers / posters
 * The stage also downgrades by itself (high → lite → css) when frames get slow.
 * Dev only: force a tier with ?tier=high|lite|css.
 */
export type Tier = 'high' | 'lite' | 'css';

type Nav = Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };

const WEAK_GPU = /swiftshader|llvmpipe|software|basic render|adreno \(tm\) [1-5]\d\d\b|mali-(4\d\d|t\d{3})|powervr (sgx|rogue ge)/i;

export function detectTier(reduce: boolean, desktop: boolean): Tier {
  if (import.meta.env.DEV) {
    const forced = new URLSearchParams(location.search).get('tier');
    if (forced === 'high' || forced === 'lite' || forced === 'css') return forced;
  }
  const nav = navigator as Nav;
  if (reduce || nav.connection?.saveData) return 'css';

  const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
  if (!gl) return 'css';
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  gl.getExtension('WEBGL_lose_context')?.loseContext();

  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;          // not reported by Safari/Firefox → assume enough
  if (WEAK_GPU.test(gpu) || maxTexture < 4096 || cores < 4 || memory < 4) return 'css';
  return desktop ? 'high' : 'lite';
}
