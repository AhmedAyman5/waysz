---
name: waysz-motion
description: WaysZ animation system — GSAP + ScrollTrigger + Lenis, the data-attribute motion API, scenes, the cinematic media toolkit (background video, scroll-scrubbed image sequences, expanding media, Lottie, mouse depth layers, plane cursor), RTL/Arabic rules, reduced-motion and performance rules. Use for ANY animation, scroll effect, transition, cursor, hover or micro-interaction, or motion bug on the WaysZ website.
---

# WaysZ Motion System

Code = source of truth: `src/motion/**` + `src/components/{BgVideo,ImageSequence,Lottie,CursorPlane}.astro`.
Live examples: `src/views/HomePage.astro` (hero, journey, WebGL stage) and `src/views/MotionLab.astro`
→ http://localhost:4321/dev/motion-lab/ (LTR: `/en/dev/motion-lab/`).
Home concept and storyboard: `docs/home-creative-treatment.md`.
`reference.md` = scene contracts + the page storyboard. Media sourcing/optimizing = skill **waysz-media**.

## Direction: "The Journey", filmed

The logo is a road with a plane taking off. The intro animates the logo; the PAGES tell the journey with
real footage: take-off, flying above clouds, landing on the right service. Apple-product-page techniques:
scroll-scrubbed footage, media that expands to full screen, sticky full-bleed media, huge staged type.
Personality: calm, confident, smooth. Entrances `expo.out` 0.8–1.4s · scrubbed scenes `none` ·
UI feedback 0.2–0.3s. One orchestrated moment per section — never a fade-up on every element.

**Creative freedom:** the goal on every page is a jaw-dropping, Awwwards-level experience. You are free to create
your own animations, scenes, shaders and 3D acts, and to source your own footage, models, textures and
animations, whenever it makes the site more impressive. The scenes below are a toolkit, not a limit. Only rule
for external files: a clear free license (approved list in **waysz-media**) + a row in `docs/media-credits.md`.

## Wiring (already in place)

1. `BaseLayout` `<head>` boot script: adds `.js`, adds `.intro-seen` (intro already played / reduced
   motion), removes `.js` after 4s if motion never starts (failsafe).
2. `base.css` hides ONLY what JS reveals: `.js [data-reveal] / [data-split] / [data-intro]`.
3. `initForms(); initMotion();` → `env = { reduce, rtl, dir, desktop, tier }`, Lenis on `gsap.ticker`,
   globals, then every `[data-scene]` lazy-loaded in DOM order, then `ScrollTrigger.refresh()`.
   `env.tier` = `high | lite | css` (also on `<html data-tier>`); it can drop at runtime.

## Global data-* API (globals ignore anything inside a [data-scene])

| Attribute / element                              | Effect                                                 | Notes                |
| ------------------------------------------------ | ------------------------------------------------------ | -------------------- |
| `data-reveal` = up · fade · scale · clip         | enters once at 85% in view                             | use sparingly        |
| `data-split` = words · lines                     | words/lines rise from a mask                           | NEVER chars (Arabic) |
| `data-intro`                                     | hidden until its scene reveals it on load              | hero content         |
| `data-draw` · `data-draw="scrub"`                | SVG stroke draws once / with scroll                    |                      |
| `data-parallax="0.15"`                           | drifts on scroll                                       | desktop              |
| `data-depth="0.4"` (inside `[data-depth-scene]`) | layer moves opposite to the mouse × depth              | desktop              |
| `data-magnetic`                                  | leans toward the pointer                               | desktop              |
| `data-spotlight`                                 | soft light follows the pointer                         | desktop              |
| `data-cursor="label"`                            | plane cursor grows and shows the label on hover        | desktop              |
| `<video data-bgvideo>` (via `<BgVideo>`)         | plays only while ≥25% visible, pauses otherwise        |                      |
| `[data-lottie]` (via `<Lottie>`)                 | loads near viewport; modes loop · once · hover · scrub |                      |
| `data-waypoint`                                  | adds a tick for this section on the flight rail        | desktop              |
| `.site-header`                                   | hide on scroll down / show on up / solid after 80px    |                      |
| `.flight-rail` · `.flight-bar`                   | flight progress: plane on a rail / thin top line       | desktop / touch      |

## 3D layer — `src/motion/stage/` (three.js + GLSL)

- **One renderer + one canvas per page** (`stage.ts`). Scenes never create their own. Each section that
  draws registers an **act** (`acts/*.ts`: `host`, `scene`, `camera`, `ready`, `update`, `resize`,
  `setQuality`, `dispose`). Acts so far: `flight` (Home hero + journey), `wipe` (Home §1.3 photo transitions),
  `globe` (Home §1.5 night Earth + route), `explore` (Immigration page: the same Earth with country borders,
  free rotation, picking and a flight from Egypt — the scene drives it through `ExploreControls` in `bridge.ts`),
  `glyphs` (Software page hero: instanced glyph quads from a canvas atlas that land on the DOM code + a swarm in
  depth with a pointer field; all motion in the vertex shader; 1100 swarm glyphs on `high`, 320 on `lite`).
- **Hand-off between acts**: the canvas moves into the host of the act that is MOST visible. While it paints
  there the host has `.is-drawing` — hide the section's DOM media with CSS on that class
  (`.host.is-drawing ~ .card .media { visibility: hidden }`); when the canvas leaves, the DOM version is back.
  Make two neighbouring acts meet on the same flat colour so the swap cannot be seen.
- **Adding an act** from a scene: `addAct(env, async () => (await import('../stage/acts/x')).createX(host, …))`
  inside a `ScrollTrigger` `once` at `top 250%` (the act's chunk and textures load only when the section is
  near). Host element: `<div class="stage-host" aria-hidden="true">` (styles in base.css). `addAct` does nothing
  on the css tier / reduced motion, and a failing act never breaks the page.
- Photo textures: `createImageBitmap(img, { imageOrientation: 'flipY' })` + `texture.flipY = false` — an `<img>`
  reports its layout size and breaks the upload on small screens. Reuse the section's own `<img>` (no second download).
- Colours: our own shaders work in display space (token colour in → same colour out). three's built-in
  materials and `scene.background` are colour-managed: give them `color.convertSRGBToLinear()`.
- No depth buffer on the shared renderer: fix draw order with `renderOrder` + `depthTest: false`; anything that
  floats over a sphere fades itself out on the far side (see `arcFragment`).
- **Lazy**: `startFlightStage(env)` is called by the hero scene AFTER the hero text is on screen; it then
  waits for the visitor's FIRST INTERACTION (pointer move, touch, wheel, key, scroll) and only then
  dynamic-imports three.js. Shaders compile with `renderer.compileAsync` (non-blocking). This keeps the
  heaviest work out of page load (blocking time); until then the DOM version is on screen.
- **One loop**: rendering runs on `gsap.ticker`. It stops when the act's host is off screen
  (IntersectionObserver) or the tab is hidden. DPR cap: 1.5 high · 1.25 lite.
- **Tiers by device capability** (`tier.ts`), never by "is it a phone":
  `high` desktop GPU · `lite` capable phones/tablets (WebGL2, ≥ 4 cores, ≥ 4 GB when reported, not a weak GPU)
  · `css` everything else, plus saveData and reduced motion. Dev: force with `?tier=high|lite|css`.
- **Watchdog**: two slow sample windows in a row (avg frame > 27ms) → `high → lite → css`. `css` = dispose
  and show the DOM version again. `webglcontextlost` does the same.
- **Dispose** on `pagehide`: geometries, materials, textures, `renderer.dispose()`, `forceContextLoss()`.
- **Scenes and the stage talk through `bridge.ts`** (plain object `flight`): scenes own scroll and write
  `push`, `veil`, `mix`, `speed`, `frame`; the act reads them every frame. Scenes never import three.
- **The DOM version always exists underneath** (poster/video, 2D canvas, CSS cloud layers, veil element).
  `.is-live` on `[data-flight]` hides those media while the canvas draws; text and scrims stay DOM.
- Shaders live in `shaders/*.glsl.ts`. Quality is set with `#define`s (`OCT`, `LAYERS`, `RAYS`), not branches.
  Work in display (sRGB) space for footage plates; read colors from the semantic tokens (see `token()` in
  `acts/flight.ts`) — no hex in shaders.
- New 3D section = a new act + its host element + a few fields in `bridge.ts`. Reuse the stage.

## Media toolkit

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
  `eager` (first screen only), `focus` (object-position), `class`.
- Renders the poster as a real `<img>` (LCP, no-JS, reduced motion; `<picture>` picks the mobile poster)
  and an empty `<video muted loop playsinline preload="none">` on top that fades in once it plays.
- JS picks the mobile variant below 1024px and webm/mp4, sets `src` when near the viewport, plays when
  ≥25% visible, pauses otherwise. Reduced motion OR `navigator.connection.saveData` → poster only.
- Text on top: dark gradient overlay (`::after`), never raw text on footage.

### Scroll-scrubbed image sequence — `ImageSequence.astro` + `scenes/image-sequence.ts`

- Props: `name` (→ `/media/seq/<name>/frame_0001.webp`…), `frames`, `mobile` + `mobileFrames` (lighter
  set `/media/seq/<mobile>/` for < 1024px: portrait crop, half the frames) or `mobileStep`, `focus`,
  `label`, `id`, `veil` (Home: cloud white-out at both ends + frames drawn by the WebGL stage).
  Captions in the slot: `<p class="seq__caption" data-at="0.25">` (progress where each one shows).
- Frames are fetched as Blobs, in order, 3 at a time, only once the section is near (Home: after the first
  scroll). A sliding window (±12 desktop, ±8 mobile) is decoded off the main thread with
  `createImageBitmap(blob)`; drawing never blocks on a decode and memory stays flat.
- Draws on a 2D canvas (cover-fit, DPR ≤ 1.5) or hands the bitmap to the WebGL stage (`bridge.flight.frame`).
  Uploading a frame to the GPU is the expensive step: the act skips every other upload when a frame ran
  long, and freed bitmaps are closed in idle time. Keep frames ≤ 1280px wide.
- Section pins: desktop `end: '+=300%'`, mobile `+=180%`, `scrub: 0.5`; frame = round(progress × (n−1)).
- Captions take turns around their `data-at`; small ticks show which one is on.
- Without JS / reduced motion: no pin, frame 1 as a still, every caption visible.

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

Home: preloader · hero-takeoff · image-sequence · areas · media-reveal · globe-route · approach ·
boarding-pass · footer-landing (every page). Immigration page: page-hero · journey-route · dossier ·
explore-globe (+ boarding-pass, approach). Software page: code-hero · code-forge · build-steps · ask-box (+ approach).
Other pages / Motion Lab: destinations · route-steps ·
boarding-gate · text-scrub · services-filter · accordion · form-flight · hero-logo · dive.
Contracts and what to reuse on Services / About / Contact: `reference.md`.

### Sticky screens (Home §1.3–1.5) — the pattern to copy

A tall section, a `position: sticky; top: 0; height: 100lvh` view inside it, and ONE scrubbed timeline
(`trigger: section, start: 'top top', end: 'bottom bottom'`). The scene adds `.is-scrub` to the root; all the
sticky/absolute layout lives under that class, so without JS or with reduced motion the section is plain flow.
- Let content REST: map scroll to progress with plateaus (see `span()` in `areas.ts`, `HOPS` in `globe-route.ts`).
- State that scroll hides is faded with `opacity` (never `autoAlpha`): it stays in the accessibility tree; toggle
  `pointer-events` with an `.is-active` class and scroll a focused link's card into place.
- Headings: `SplitText` words with `mask: 'words'`, `wordsClass: 'w'` (base.css gives `.w-mask` room for Arabic marks).
- A second layout for small/short screens goes in `gsap.matchMedia()` and flips a class (`.is-wide`).

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
4. Arabic: split by words or lines only. Never chars. Decorative Latin code (Software page) may be split into
   characters (`motion/code-glyphs.ts`); it is always LTR, so its horizontal motion is NOT multiplied by `env.dir`.
5. RTL: horizontal values × `env.dir`. Logos, photos and videos never mirror.
6. Reduced motion: final state instantly; no Lenis, pins, parallax, depth, cursor, video autoplay.
7. Mobile (< 1024px or touch): pins ≤ `+=180%` (sequences) / `+=100%` (others); no depth, cursor,
   magnetic, spotlight; lighter media.
8. Max **2 pinned scenes per page — 3 on Home**, only while scrolling stays smooth (Home uses 1: the Journey).
   Never animate the pinned element itself — animate its children. Prefer CSS `position: sticky` + a
   scrubbed ScrollTrigger when a scene only needs to hold the screen (the Home hero does this).
9. One RAF loop (`gsap.ticker`) — WebGL rendering included. No custom `requestAnimationFrame` loops, no
   `scroll` listeners. (Canvas drawing for sequences happens inside the ScrollTrigger `onUpdate`.)
10. Selectors scoped to the scene root. No global selectors in scenes.
11. `markers: true` only while developing.
12. Text and buttons readable in their final state within ~1.2s. Legal notices never animated.
    The LCP text (hero lead + buttons) is NEVER hidden by JS/CSS: stage only the headline (`data-intro`
    on the `<h1>`), move the rest with transforms only. Never `autoAlpha: 0` on the largest text block.
13. Images: animate a wrapper, not the `<img>`. Always width/height. Below-the-fold media lazy.
14. After layout changes call `ScrollTrigger.refresh()`.
15. Test with DevTools CPU 4× and "Fast 4G" (`node scripts/qa-fps.mjs <url> 4`). If a section stutters,
    reduce frames/resolution first.
16. ScrambleText only on Latin text. All other GSAP plugins are allowed; register only what a page uses.
17. 3D never carries content: no text in the canvas, canvas `aria-hidden`, and the page must be complete
    with the canvas removed (tier `css`).

## Test checklist (before every PR that touches motion or media)

- [ ] Chrome, Safari (macOS + iOS), Firefox, Chrome on a mid-range Android.
- [ ] Arabic `/…` and English `/en/…`.
- [ ] Reduced motion ON → everything visible, nothing moves, posters instead of video.
- [ ] JS disabled → content + first frames/posters visible, no preloader.
- [ ] Resize desktop ↔ mobile → no broken pins; mobile media variants load.
- [ ] Network tab: nothing below the fold loads before you scroll near it (`node scripts/qa-weight.mjs`).
- [ ] Every tier: `?tier=high`, `?tier=lite`, `?tier=css` (`node scripts/qa-shots.mjs out/` shoots them all).
- [ ] No console errors; no long tasks > 50ms while scrolling.
