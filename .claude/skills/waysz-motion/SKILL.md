---
name: waysz-motion
description: WaysZ animation system — GSAP + ScrollTrigger + Lenis, the data-attribute motion API, scenes, the cinematic media toolkit (background video, scroll-scrubbed image sequences, expanding media, Lottie, mouse depth layers, plane cursor), RTL/Arabic rules, reduced-motion and performance rules. Use for ANY animation, scroll effect, transition, cursor, hover or micro-interaction, or motion bug on the WaysZ website.
---

# WaysZ Motion System

Code = source of truth: `src/motion/**` + `src/components/{BgVideo,ImageSequence,Lottie,CursorPlane}.astro`.
Live examples: `src/views/MotionLab.astro` → http://localhost:4321/dev/motion-lab/ (LTR: `/en/dev/motion-lab/`).
`reference.md` = scene contracts + the page storyboard. Media sourcing/optimizing = skill **waysz-media**.

## Direction: "The Journey", filmed

The logo is a road with a plane taking off. The intro animates the logo; the PAGES tell the journey with
real footage: take-off, flying above clouds, landing on the right service. Apple-product-page techniques:
scroll-scrubbed footage, media that expands to full screen, sticky full-bleed media, huge staged type.
Personality: calm, confident, smooth. Entrances `expo.out` 0.8–1.4s · scrubbed scenes `none` ·
UI feedback 0.2–0.3s. One orchestrated moment per section — never a fade-up on every element.

## Wiring (already in place)

1. `BaseLayout` `<head>` boot script: adds `.js`, adds `.intro-seen` (intro already played / reduced
   motion), removes `.js` after 4s if motion never starts (failsafe).
2. `base.css` hides ONLY what JS reveals: `.js [data-reveal] / [data-split] / [data-intro]`.
3. `initForms(); initMotion();` → `env = { reduce, rtl, dir, desktop }`, Lenis on `gsap.ticker`,
   globals, then every `[data-scene]` lazy-loaded in DOM order, then `ScrollTrigger.refresh()`.

## Global data-* API (globals ignore anything inside a [data-scene])

| Attribute / element                              | Effect                                                 | Notes                |
| ------------------------------------------------ | ------------------------------------------------------ | -------------------- |
| `data-reveal` = up · fade · scale · clip         | enters once at 85% in view                             | use sparingly        |
| `data-split` = words · lines                     | words/lines rise from a mask                           | NEVER chars (Arabic) |
| `data-intro`                                     | hidden until its scene reveals it on load              | hero content         |
| `data-draw` · `data-draw="scrub"`                | SVG stroke draws once / with scroll                    |                      |
| `data-parallax="0.15"`                           | drifts on scroll                                       | desktop              |
| `data-depth="0.4"` (inside `[data-depth-scene]`) | layer moves opposite to the mouse × depth              | desktop; NEW         |
| `data-magnetic`                                  | leans toward the pointer                               | desktop              |
| `data-spotlight`                                 | soft light follows the pointer                         | desktop              |
| `data-cursor="label"`                            | plane cursor grows and shows the label on hover        | desktop; NEW         |
| `<video data-bgvideo>` (via `<BgVideo>`)         | plays only while ≥25% visible, pauses otherwise        | NEW                  |
| `[data-lottie]` (via `<Lottie>`)                 | loads near viewport; modes loop · once · hover · scrub | NEW                  |
| `.site-header`                                   | hide on scroll down / show on up / solid after 80px    |                      |
| `.flight-rail`                                   | plane on a rail = scroll position                      | desktop              |

## Media toolkit (NEW — specs to implement / keep)

### Plane cursor — `CursorPlane.astro` + `globals/cursor.ts`

- Desktop + `pointer: fine` + no reduced motion only. Uses the logo plane path, colored `--color-accent`.
- Follows the pointer with `gsap.quickTo` (x/y ~0.35s), rotates toward the movement direction
  (angle from velocity, smoothed; keep the last angle when still).
- Hover on `a, button, [data-cursor]`: scale up; `[data-cursor="…"]` shows the text label beside it.
- Native cursor hidden ONLY under `html.motion-ready.has-cursor`; text inputs/textarea/select keep the
  native caret cursor. Hide the plane when the pointer leaves the window.

### Mouse depth layers — `globals/depth.ts`

- Container `[data-depth-scene]`, children `[data-depth="0.1…1"]`. Pointer offset from the container
  center (−1…1) × depth × 40px (x and y), via `quickTo` (0.8s, `power3.out`). Optional slight rotate.
- Use for: transparent cloud PNGs over the hero video, floating photo cards, ambient gradient blobs.

### Background video — `BgVideo.astro` + `globals/video.ts`

- Props: `name` (→ `/media/video/<name>.webm|.mp4|-poster.webp`), `mobile` (lighter variant name),
  `class`. Renders `<video muted loop playsinline preload="none" poster>` + sources, `aria-hidden="true"`.
- JS picks the mobile variant below 1024px, sets `preload` when near viewport, plays when ≥25% visible,
  pauses otherwise. Reduced motion OR `navigator.connection.saveData` → never plays (poster only).
- Text on top: dark gradient overlay (`::after`), never raw text on footage.

### Scroll-scrubbed image sequence — `ImageSequence.astro` + `scenes/image-sequence.ts`

- Props: `name` (→ `/media/seq/<name>/frame_0001.webp`…), `frames`, `mobileStep` (default 2 = every
  2nd frame on mobile), captions slot with `[data-at="0.25"]` (progress where each caption shows).
- Canvas covers the viewport (cover-fit math, DPR capped at 2, redraw on resize).
- Frame 1 loads immediately (it is also the no-JS/reduced-motion image); the rest load in the
  background when the section is within one viewport, in order, never blocking.
- Section pins: desktop `end: '+=300%'`, mobile `+=180%`, `scrub: 0.5`; frame = round(progress × (n−1)).
- Captions: fade/rise in around their `data-at` and out before the next one.
- Reduced motion: no pin, static last-but-one frame, captions all visible.

### Expanding media — `scenes/media-reveal.ts`

- `<section data-scene="media-reveal">` with `.reveal__media` (img or BgVideo) and `.reveal__text`.
- Pinned (`+=150%`): media goes from `clip-path: inset(18% 22% round 28px)` + `scale: 1.15` (inner) to
  `inset(0% 0% round 0px)` + `scale: 1`; text appears after 60% progress. Mobile: shorter, smaller inset.

### Sticky media cards — `scenes/destinations.ts` (upgrade)

- Each `.dest-card` is full-viewport with `.dest-card__media` (img or BgVideo) behind a gradient,
  content on top, optional `<Lottie>` icon. Next card slides over; previous scales to 0.9 and dims.

### Lottie — `Lottie.astro` + `globals/lottie.ts`

- `<Lottie src="/media/lottie/plane.json" mode="loop|once|hover|scrub" label? />`.
- `lottie-web` is dynamically imported ONLY if `[data-lottie]` exists. SVG renderer. Load at ~1 viewport away.
- `scrub`: ScrollTrigger progress → `goToAndStop(frame, true)`. `once`: play when in view.
- Reduced motion: show the last frame, no playback. Decorative → `aria-hidden`; meaningful → `label`.

## Scenes (`src/motion/scenes/<name>.ts`)

preloader · hero-takeoff · image-sequence · media-reveal · destinations · route-steps · boarding-gate ·
footer-landing · text-scrub · services-filter · accordion · form-flight · (dive — kept, not used on Home v2).

### Writing a new scene

```ts
// src/motion/scenes/example.ts — markup: <section data-scene="example">
import { gsap } from "gsap";
import type { Scene } from "../index";

const scene: Scene = (root, env) => {
  const q = gsap.utils.selector(root);
  if (env.reduce) {
    gsap.set(q(".item"), { autoAlpha: 1 });
    return;
  }
  const mm = gsap.matchMedia();
  mm.add(
    { desktop: "(min-width: 1024px)", mobile: "(max-width: 1023px)" },
    (ctx) => {
      const { desktop } = ctx.conditions!;
      gsap
        .timeline({
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "+=120%",
            scrub: 0.6,
            pin: desktop,
          },
        })
        .fromTo(
          q(".item"),
          { autoAlpha: 0, x: 80 * env.dir },
          { autoAlpha: 1, x: 0 },
        );
    },
  );
};
export default scene;
```

## Rules (non-negotiable)

1. Animate only `x, y, scale, rotation, autoAlpha`, `clip-path`, SVG strokes, canvas frames.
   Never width/height/top/left/margin (exception: accordion `height: 'auto'`).
2. CSS-hidden elements: animate with `fromTo`/`to` ending at `autoAlpha: 1`, never `gsap.from()`.
3. Never put a CSS `transform` on an element GSAP animates — wrap it.
4. Arabic: split by words or lines only. Never chars.
5. RTL: horizontal values × `env.dir`. Logos, photos and videos never mirror.
6. Reduced motion: final state instantly; no Lenis, pins, parallax, depth, cursor, video autoplay.
7. Mobile (< 1024px or touch): pins ≤ `+=180%` (sequences) / `+=100%` (others); no depth, cursor,
   magnetic, spotlight; lighter media.
8. Max **2 pinned scenes per page**. Never animate the pinned element itself — animate its children.
9. One RAF loop (`gsap.ticker`). No custom `requestAnimationFrame` loops, no `scroll` listeners.
   (Canvas drawing for sequences happens inside the ScrollTrigger `onUpdate`.)
10. Selectors scoped to the scene root. No global selectors in scenes.
11. `markers: true` only while developing.
12. Text and buttons readable in their final state within ~1.2s. Legal notices never animated.
13. Images: animate a wrapper, not the `<img>`. Always width/height. Below-the-fold media lazy.
14. After layout changes call `ScrollTrigger.refresh()`.
15. Test with DevTools CPU 4× and "Fast 4G". If a section stutters, reduce frames/resolution first.

## Test checklist (before every PR that touches motion or media)

- [ ] Chrome, Safari (macOS + iOS), Firefox, Chrome on a mid-range Android.
- [ ] Arabic `/…` and English `/en/…`.
- [ ] Reduced motion ON → everything visible, nothing moves, posters instead of video.
- [ ] JS disabled → content + first frames/posters visible, no preloader.
- [ ] Resize desktop ↔ mobile → no broken pins; mobile media variants load.
- [ ] Network tab: nothing below the fold loads before you scroll near it.
- [ ] No console errors; no long tasks > 50ms while scrolling.
