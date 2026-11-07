---
name: waysz-motion
description: WaysZ animation system — GSAP + ScrollTrigger + Lenis architecture, the data-attribute motion API, scene files, RTL/Arabic rules, reduced-motion and performance rules. Use for ANY animation, scroll effect, page transition, hover or micro-interaction, preloader, or motion bug on the WaysZ website.
---

# WaysZ Motion System

The code is the source of truth: `src/motion/**`. Live examples of everything below:
`src/views/MotionLab.astro` → http://localhost:4321/dev/motion-lab/ (and `/en/dev/motion-lab/` for LTR).
`reference.md` (same folder) = scene catalog with markup contracts + the page-by-page motion map.

## The idea: "The Journey"
The logo is a road with a plane taking off from it. The site tells that story: the visitor **takes off**
(preloader + hero), **dives** into the road (hero → content), the plane **travels with them** (flight rail,
route lines) and **lands** (footer). Signature moments serve this metaphor; everything else stays calm.

Personality: confident and smooth, never bouncy. Entrances `expo.out` 0.6–1.2s · scrubbed scenes `none`
or `power2.inOut` · UI feedback 0.2–0.3s. One orchestrated moment per section beats many small effects:
do NOT put a fade-up on every element of every section.

## How it is wired
1. `BaseLayout.astro` `<head>` has an `is:inline` boot script: adds `.js` to `<html>`, adds `.intro-seen`
   when the intro already played this session or reduced motion is on, and removes `.js` after 4s if
   motion never starts (failsafe → content always becomes visible).
2. `base.css` hides ONLY what JS will reveal: `.js [data-reveal] / [data-split] / [data-intro]`.
3. `BaseLayout` ends with `initForms(); initMotion();` (`src/motion/index.ts`):
   - builds `env` = `{ reduce, rtl, dir: rtl ? -1 : 1, desktop }` once,
   - starts Lenis (unless reduced motion) driven by `gsap.ticker` (one RAF loop),
   - runs the globals (data-* behaviors),
   - lazy-loads every `[data-scene]` in DOM order (`data-scene="a b"` = two scenes on one element),
   - adds `.motion-ready`, waits for fonts, `ScrollTrigger.refresh()`.

## The data-* API (globals — they ignore anything inside a [data-scene])
| Attribute | Effect | Notes |
|---|---|---|
| `data-reveal` = `up` (default) · `fade` · `scale` · `clip` | enters once at 85% in view | batched; use sparingly |
| `data-split` = `words` (default) · `lines` | words/lines rise from a mask | NEVER chars (Arabic) |
| `data-intro` | hidden until its scene reveals it on load | hero content |
| `data-draw` · `data-draw="scrub"` | SVG stroke draws once / follows scroll | path, line, circle, rect… |
| `data-parallax="0.15"` | drifts on scroll by that factor | desktop only |
| `data-magnetic` | leans toward the pointer | desktop only |
| `data-spotlight` | soft light follows the pointer | desktop only (CSS in base.css) |
| `.site-header` | hides scrolling down, shows scrolling up, solid after 80px | `globals/header.ts` |
| `.flight-rail` | plane on a rail = scroll position (replaces the hidden scrollbar) | desktop only |

## Scenes (`src/motion/scenes/<name>.ts`)
`preloader` · `hero-takeoff` · `dive` · `destinations` · `route-steps` · `boarding-gate` · `footer-landing`
· `text-scrub` · `services-filter` · `accordion` · `form-flight`. Contracts in `reference.md`.

### Writing a new scene
```ts
// src/motion/scenes/example.ts — markup: <section data-scene="example">
import { gsap } from 'gsap';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  const q = gsap.utils.selector(root);                     // ALWAYS scope to the scene
  if (env.reduce) { gsap.set(q('.item'), { autoAlpha: 1 }); return; }

  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 1024px)', mobile: '(max-width: 1023px)' }, (ctx) => {
    const { desktop } = ctx.conditions!;
    gsap.timeline({
      scrollTrigger: { trigger: root, start: 'top top', end: '+=120%', scrub: 0.6, pin: desktop },
    }).fromTo(q('.item'), { autoAlpha: 0, x: 80 * env.dir }, { autoAlpha: 1, x: 0 });
  });
};
export default scene;
```
For SVG elements use typed lookups: `root.querySelector<SVGPathElement>('.mark-road')!`.
Logo constants (plane heading, road point, dive zoom) live in `src/motion/config.ts → LOGO`.

## Rules (non-negotiable)
1. Animate only `x, y, scale, rotation, autoAlpha`, `clip-path`, and SVG strokes (DrawSVG).
   Never width/height/top/left/margin (exception: accordion `height: 'auto'`).
2. Elements hidden by CSS (`data-reveal/split/intro`): animate with `fromTo`/`to` ending at `autoAlpha: 1`.
   `gsap.from()` would animate them back to hidden.
3. Never put a CSS `transform` on an element GSAP animates — wrap it, transform the wrapper.
4. Arabic: split by words or lines only. Never chars.
5. RTL: horizontal values × `env.dir`. Logos never mirror. Horizontal lines draw from their end in RTL.
6. Reduced motion: every scene shows its final state instantly; no Lenis, no pins, no parallax.
7. Mobile (< 1024px or touch): no pin longer than `+=100%`, no parallax/magnetic/spotlight.
8. Max **2 pinned scenes per page**. Never animate the pinned element itself — animate its children.
9. One RAF loop (`gsap.ticker`). No custom `requestAnimationFrame`, no `scroll` event listeners.
10. Selectors scoped with `gsap.utils.selector(root)` or `root.querySelector`. No global selectors in scenes.
11. `markers: true` only while developing. Never commit it.
12. Content first: text and buttons readable in their final state within ~1.2s. Legal notices and form
    warnings are NEVER animated.
13. Preloader: home only, first visit per session, ~2s, never with reduced motion.
14. Images: animate a wrapper (clip/scale), not the `<img>`. Always set width/height.
15. After layout changes (accordion, filter) call `ScrollTrigger.refresh()`.
16. Test with DevTools CPU throttling 4×. If a scene drops frames, simplify it before shipping.

## Page transitions
Pure CSS in `base.css` (`@view-transition { navigation: auto; }` + `::view-transition-*`).
Chrome/Edge/Safari animate; Firefox loads normally. Do not add a JS router.

## Test checklist (before every PR that touches motion)
- [ ] Chrome, Safari (macOS + iOS), Firefox, Chrome on a mid-range Android.
- [ ] Arabic `/…` and English `/en/…`.
- [ ] Reduced motion ON → everything visible, nothing moves.
- [ ] JS disabled → all content visible, no preloader.
- [ ] Resize desktop ↔ mobile → no broken pins or leftover transforms.
- [ ] Keyboard Tab through the page; focus always visible.
- [ ] No console errors; no long tasks > 50ms while scrolling (DevTools Performance).
