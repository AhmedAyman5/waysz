# WaysZ Motion — Scene Contracts & Page Storyboard

Scenes: `src/motion/scenes/<name>.ts`, opted in with `data-scene="<name>"`.
Home is built directly in `HomePage.astro` (concept: `docs/home-creative-treatment.md`); other pages copy
patterns from the Motion Lab.
Media files and search terms: skill **waysz-media** (shot list).

---

## Scene contracts

### preloader — logo "Take-off" (home only, first visit per session) — KEEP AS IS

Rendered by `BaseLayout` when the page passes `preloader`. Dispatches `waysz:intro-done`.

### hero-takeoff — Home §1.2 "In the sky"

```html
<div class="flight theme-dark" data-flight>
  <div class="flight__stage" aria-hidden="true"></div>   <!-- WebGL canvas host: sticky for the whole flight -->
  <section class="hero" data-scene="hero-takeoff" data-depth-scene data-waypoint>
    <div class="hero__sticky">
      <div class="hero__media" aria-hidden="true">
        <div class="hero__plate"><BgVideo name="hero-clouds" mobile="hero-clouds-m" eager /></div>
        <img class="hero__cloud hero__cloud--far"  data-depth="0.3" data-src="/media/img/cloud-2.webp" alt="" />
        <img class="hero__cloud hero__cloud--near" data-depth="0.8" data-src="/media/img/cloud-1.webp" alt="" />
        <div class="hero__veil"></div>
      </div>
      <div class="hero__scrim" aria-hidden="true"></div>
      <div class="hero__content container"><div class="hero__text">
        <h1 class="hero__title" data-intro><span class="hero__line">…</span><span class="hero__line">…</span></h1>
        <p class="hero__lead">…</p>
        <div class="hero__actions">…</div>
      </div></div>
    </div>
  </section>
  <ImageSequence … veil />   <!-- overlaps the hero's last screen (margin-block-start: -100lvh) -->
</div>
```

- Entrance (after the intro): headline WORDS rise from a mask; lead + buttons are never hidden (LCP) and
  only settle 28px on a first visit. Then `startFlightStage(env)`.
- Scroll: the hero is 190lvh tall with a sticky 100lvh inner (no pin). Progress 0→1 = the camera pushes
  into the clouds and ends in a white-out exactly when the journey pins.
- `high` / `lite`: video + clouds + rays are drawn by the stage (`.is-live` hides `.hero__media`).
  `css`: the video, the two cloud photos (`data-src`, fetched after the entrance) and `.hero__veil` do it.
- The logo mark is NOT in the hero — the intro already showed it. (Motion Lab keeps the old logo hero
  as `hero-logo`.)

### image-sequence — Home §1.2b "The Journey"

```html
<ImageSequence id="journey" name="takeoff" frames={140} mobile="takeoff-m" mobileFrames={70} label="…" veil>
  <p class="seq__caption" data-at="0.14">…</p>
  <p class="seq__caption" data-at="0.4">…</p>
  <p class="seq__caption" data-at="0.64">… <a class="seq__more" href="/about/">…</a></p>
</ImageSequence>
```

Pinned (pin 1 of 3); scrolling plays the take-off frame by frame; the three captions are the brief's §1.2
intro paragraph cut at its own punctuation. With `veil` the first 10% clears the cloud white-out and the
last 12% climbs back into it, ending in the page background colour.

### media-reveal — Home §1.4 intro · About §4.1

`<section data-scene="media-reveal">` → `.reveal__media` (photo or BgVideo) expands from an inset rounded
card to full screen; `.reveal__text` appears at 60%.

### destinations — Home §1.3 (v2: full-bleed media cards)

```html
<div data-scene="destinations">
  <article class="dest-card" style="--i:0; --hue: var(--hue-legal)">
    <div class="dest-card__media"><image … /></div>
    <!-- or <BgVideo> -->
    <div class="dest-card__body">
      <Lottie src="/media/lottie/scales.json" mode="once" />
      <h3 />
      <p />
      <a />
    </div>
  </article>
  … ×4
</div>
```

Sticky stacking; next card covers the previous one, which scales to 0.9 and dims.

### route-steps — Home §1.5 · Service template steps · About §4.4

Existing contract (route path + `.route__plane` + `.step.is-active`). v2: optional map/photo background
behind the route; the plane may be a `<Lottie mode="loop">` inside `.route__plane`.

### boarding-gate — Home §1.7

`.pass` + `path.pass__perf` + `.stamp`. v2: section background = airport photo with dark overlay.

### text-scrub · services-filter · accordion · form-flight · footer-landing

Unchanged (see Motion Lab). The footer keeps the logo landing.

---

## Page storyboard v2 (waysz.org)

| Brief § | Section          | Media                                                                   | Motion                                                                |
| ------- | ---------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| —       | Intro            | logo                                                                    | `preloader` (unchanged)                                               |
| 1.1     | Header           | —                                                                       | transparent over the hero, dark glass after 80px · «خدماتنا» submenu  |
| 1.2     | Hero             | wing-view video at dusk inside the WebGL stage + shader clouds          | `hero-takeoff` (sticky, scrubbed) · stage act `flight` — BUILT        |
| 1.2b    | The Journey      | window-seat take-off sequence, dusk grade                               | `image-sequence` (pin 1) + 3 captions · cloud fly-through — BUILT     |
| 1.3     | 4 service areas  | photo per area (justice, generic travel, hall, code), graded navy/amber | `destinations` (sticky full-bleed, cloud-wipe) + Lottie icons         |
| 1.4     | Why WaysZ        | one wide photo (cabin window / meeting room at dusk)                    | `media-reveal` (pin 2) → 6 reasons                                    |
| 1.5     | How we work      | NASA Black Marble night-Earth globe (new stage act) + route arc         | `route-steps` (pin 3) · fallback: still image + SVG route             |
| 1.6     | CTA              | approach lights at dusk (video/photo + light points in the stage)       | `data-split` · `data-magnetic`                                        |
| 1.7     | WaysZ Visa link  | airport photo behind a dark overlay                                     | `boarding-gate` + Lottie visa stamp                                   |
| 1.8     | Footer           | logo                                                                    | `footer-landing`                                                      |
| 2       | Services         | header photo per area tab                                               | `services-filter` (Flip) · cards with photos                          |
| 3       | Service template | header photo of the service's area                                      | `data-split` · `route-steps` · `accordion`                            |
| 4       | About            | wide photo                                                              | `media-reveal` · `text-scrub` · `route-steps` (2 stops)               |
| 5       | Contact          | calm photo                                                              | `form-flight` · `data-magnetic`                                       |

Pins: Home may use 3 — `image-sequence` (1.2b), `media-reveal` (1.4), `route-steps` (1.5). The hero and
`destinations` are CSS sticky, not pins. Other pages: max 2.
