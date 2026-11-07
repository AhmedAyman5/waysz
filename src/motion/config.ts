/** Motion constants — keep in sync with the CSS motion tokens in tokens.css. */
export const EASE = { out: 'expo.out', inOut: 'power2.inOut', ui: 'power3.out' } as const;
export const DUR = { ui: 0.25, base: 0.6, slow: 1.1 } as const;
export const BP = { desktop: '(min-width: 1024px)', mobile: '(max-width: 1023px)' } as const;

/** Temp-logo constants. Re-measure when the final logo arrives (see reference.md). */
export const LOGO = {
  planeHeading: 19,          // the plane points ~19° above horizontal → MotionPath autoRotate offset
  roadPoint: [0.384, 0.662], // a wide, near-vertical stretch of the road, as a fraction of the mark box
  diveScale: 40,             // how far the camera zooms into the road
} as const;

/** Resolves when the preloader is gone (immediately if there is none). */
export const introDone = () =>
  new Promise<void>((resolve) => {
    if (!document.querySelector('[data-scene~="preloader"]')) return resolve();
    window.addEventListener('waysz:intro-done', () => resolve(), { once: true });
  });
