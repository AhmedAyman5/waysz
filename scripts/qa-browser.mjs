/**
 * Shared browser launch for the QA scripts: the installed Google Chrome with the real GPU, so the WebGL
 * tiers render. Set QA_CHROME=/path/to/chrome to use another Chromium build (e.g. Playwright's own on Linux).
 */
import { chromium } from 'playwright';

export const launch = () =>
  chromium.launch({
    ...(process.env.QA_CHROME ? { executablePath: process.env.QA_CHROME } : { channel: 'chrome' }),
    args: [
      ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : ['--use-angle=gl']),
      '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required',
    ],
  });
