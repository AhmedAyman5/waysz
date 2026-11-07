# WaysZ Motion — Scene Contracts & Page Storyboard

Scenes: `src/motion/scenes/<name>.ts`, opted in with `data-scene="<name>"`.
Every technique is first demonstrated in the Motion Lab, then copied into real pages.
Media files and search terms: skill **waysz-media** (shot list).

---

## Scene contracts

### preloader — logo "Take-off" (home only, first visit per session) — KEEP AS IS

Rendered by `BaseLayout` when the page passes `preloader`. Dispatches `waysz:intro-done`.

### hero-takeoff — Home §1.2 (v2: over video)

```html
<section class="hero theme-dark" data-scene="hero-takeoff" data-depth-scene>
  <BgVideo name="hero-clouds" mobile="hero-clouds-m" class="hero__video" />
  <img class="hero__cloud" data-depth="0.3" src="…cloud-1.webp" alt="" />
  <!-- 2–3 cloud layers -->
  <img class="hero__cloud" data-depth="0.7" src="…cloud-2.webp" alt="" />
  <div class="hero__content" data-intro>
    <h1 class="hero__title">…</h1>
    <p class="hero__lead">…</p>
    <div class="hero__actions">…</div>
  </div>
</section>
```

Headline words rise; lead and buttons follow; clouds drift with the mouse. (The logo mark is NOT in the
v2 hero — the intro already showed it.)

### image-sequence — Home "The Journey" (after the hero)

```html
<ImageSequence name="takeoff" frames="{120}" mobileStep="{2}">
  <p class="seq__caption" data-at="0.15">…</p>
  <p class="seq__caption" data-at="0.45">…</p>
  <p class="seq__caption" data-at="0.75">…</p>
</ImageSequence>
```

Pinned; scrolling plays the footage frame by frame; captions appear at their progress points.

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
| 1.1     | Header           | —                                                                       | hide/show, solid · plane cursor everywhere (desktop)                  |
| 1.2     | Hero             | video: plane above clouds at golden hour + 2–3 cloud PNGs               | `hero-takeoff` + `data-depth`                                         |
| 1.2b    | The Journey      | image sequence: plane take-off / flying through clouds                  | `image-sequence` (pinned) + 3 captions from the brief intro paragraph |
| 1.3     | 4 service areas  | photo/video per area (justice, passport/airport, conference hall, code) | `destinations` (sticky full-bleed) + Lottie icons                     |
| 1.4     | Why WaysZ        | one wide photo (team at work / meeting room, no faces endorsing)        | `media-reveal` → 6 items with Lottie icons, `data-reveal`             |
| 1.5     | How we work      | world-map image or night-flight photo                                   | `route-steps` (+ Lottie plane)                                        |
| 1.6     | CTA              | short calm video (city at dusk / office)                                | `data-split` · `data-magnetic` · BgVideo                              |
| 1.7     | WaysZ Visa link  | airport photo                                                           | `boarding-gate`                                                       |
| 1.8     | Footer           | logo                                                                    | `footer-landing`                                                      |
| 2       | Services         | header photo per area tab                                               | `services-filter` (Flip) · cards with photos                          |
| 3       | Service template | header photo of the service's area                                      | `data-split` · `route-steps` · `accordion`                            |
| 4       | About            | wide photo                                                              | `media-reveal` · `text-scrub` · `route-steps` (2 stops)               |
| 5       | Contact          | calm photo                                                              | `form-flight` · `data-magnetic`                                       |

Max 2 pinned scenes per page: Home uses `image-sequence` + `media-reveal` (destinations is sticky CSS,
not a pin).
