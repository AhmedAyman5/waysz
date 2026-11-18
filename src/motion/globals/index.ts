import type { MotionEnv } from '../index';
import { initHeader } from './header';
import { initReveal } from './reveal';
import { initSplit } from './split';
import { initDraw } from './draw';
import { initFlightRail } from './flight-rail';
import { initParallax } from './parallax';
import { initMagnetic } from './magnetic';
import { initSpotlight } from './spotlight';
import { initVideo } from './video';
import { initLottie } from './lottie';
import { initDepth } from './depth';
import { initCursor } from './cursor';

export function initGlobals(env: MotionEnv) {
  initHeader();
  initReveal();
  initSplit();
  initDraw(env);
  initFlightRail(env);
  initVideo();
  initLottie();
  if (env.desktop) {            // pointer-driven effects need a mouse; every visitor with one gets them
    initParallax();
    initMagnetic();
    initSpotlight();
    initDepth();
    initCursor();
  }
}
