import type { MotionEnv } from '../index';
import { initHeader } from './header';
import { initReveal } from './reveal';
import { initSplit } from './split';
import { initDraw } from './draw';
import { initFlightRail } from './flight-rail';
import { initParallax } from './parallax';
import { initMagnetic } from './magnetic';
import { initSpotlight } from './spotlight';

export function initGlobals(env: MotionEnv) {
  initHeader();
  initReveal(env);
  initSplit(env);
  initDraw(env);
  initFlightRail(env);
  if (env.desktop && !env.reduce) {
    initParallax();
    initMagnetic();
    initSpotlight();
  }
}
