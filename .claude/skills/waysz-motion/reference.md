# WaysZ Motion — Scene Catalog & Page Map

Every scene: `src/motion/scenes/<name>.ts`, opted in with `data-scene="<name>"`.
The Motion Lab (`src/views/MotionLab.astro`) contains a working, styled example of each one —
copy its markup and CSS as the starting point.

---

## Scene catalog (markup contracts)

### preloader — "Take-off" (home only, first visit per session)
- Rendered by `BaseLayout` when the page passes `preloader`. Component: `src/components/Preloader.astro`.
- Wings start closed and part (the road opens) → a gold line draws on the road → the plane flies along
  `.mark-road` and settles → curtain lifts. Dispatches `waysz:intro-done` (the hero waits for it).

### hero-takeoff — Home §1.2
```html
<section class="hero theme-dark" data-scene="hero-takeoff dive">   <!-- position: relative -->
  <div class="hero__inner">                                          <!-- NOT positioned -->
    <div class="hero__content" data-intro>
      <h1 class="hero__title">…</h1>  <p class="hero__lead">…</p>  <div class="hero__actions">…</div>
    </div>
    <div class="hero__mark" data-intro><Logo decorative /></div>
  </div>
</section>
```
Headline words rise (SplitText words + mask), wings part, the plane takes off along the road.

### dive — Home §1.2 → §1.3 (desktop pinned; mobile = simple fade)
- Same section as hero-takeoff. The hero pins for `+=130%`; the mark zooms `LOGO.diveScale`× into the road
  at `LOGO.roadPoint`, so the dark road fills the screen and we are "inside" the next section.
- REQUIRED: hero background = road color = next section background (`theme-dark` on all three).
- `.hero__mark`'s offsetParent must be the hero. Optional `.hero__glow` decoration fades out.

### destinations — Home §1.3 (four service areas)
```html
<div data-scene="destinations">
  <article class="dest-card" style="--i:0; --hue: var(--hue-legal)">
    <svg class="dest-card__icon">…stroke paths…</svg> <h3>…</h3> <p>…</p> <a>…</a>
  </article> … ×4
</div>
```
CSS makes cards `position: sticky; top: calc(14vh + var(--i) * 1.5rem)`. The scene draws each icon and
shrinks/dims the previous card as the next arrives.

### route-steps — Home §1.5 · Service template "steps" · About §4.4
```html
<section data-scene="route-steps">
  <div class="route"><svg viewBox="0 0 1000 120">
    <path class="route__track" d="…"/> <path class="route__path" d="…same…"/> <g class="route__plane">…</g>
  </svg></div>
  <div class="steps__wrap"><span class="route__line-v"></span>
    <ol class="steps__list"><li class="step">…</li> …</ol></div>
</section>
```
Desktop: the route draws, the plane rides it, `.step.is-active` toggles. Mobile: vertical line scales.
RTL: CSS mirrors ONLY the route svg (`:dir(rtl) .route svg { transform: scaleX(-1) }`).

### text-scrub — About §4.1 (any big statement)
`<section data-scene="text-scrub"><p class="statement">…</p></section>` — words light up with scroll.

### boarding-gate — Home §1.7 (link to WaysZ Visa)
`.pass` (card) + `path.pass__perf` (perforation) + `.stamp`. Card rises, perforation draws, stamp lands.

### footer-landing — every page (already in `Footer.astro`)
Footer logo assembles; the plane lands. Footer is revealed like a curtain on desktop (sticky under `main`).

### services-filter — Services §2
Tabs `<button class="tab" data-area="all|legal|travel|events|software" aria-pressed>` +
cards `.service-card[data-area]`. Flip animates the re-layout. `/services/#legal` pre-selects a tab.

### accordion — FAQ in the service template
`.faq__item > button[aria-expanded][aria-controls] + .faq__panel[inert]`. Panels are open without JS
(`.js .faq__panel { height: 0 }` in base.css).

### form-flight — Contact §5.5
`<section data-scene="form-flight">` around a `form[data-form]` (see `src/lib/forms.ts`) and a
`.form__plane` wrapper with an `.icon-dir` svg. Success → paper plane flies off. Error → short shake.

---

## Page-by-page motion map (waysz.org)

| Brief § | Section | Motion |
|---|---|---|
| 1.1 | Header | `.site-header` global (hide/show, solid) · view-transition name |
| 1.2 | Hero | `preloader` → `hero-takeoff` + `dive` |
| 1.3 | 4 service areas | `destinations` |
| 1.4 | Why WaysZ | `data-split` title · `data-draw` route line · `data-reveal` + `data-spotlight` items |
| 1.5 | How we work | `route-steps` |
| 1.6 | CTA | `data-split` · `data-magnetic` · optional `data-parallax` decor |
| 1.7 | WaysZ Visa link | `boarding-gate` |
| 1.8 | Footer | `footer-landing` (in Footer.astro) |
| 2 | Services | `data-split` hero · `services-filter` · events-types marquee (CSS, reversed in RTL, static on reduced motion) |
| 3 | Service template | `data-split` hero · `route-steps` · `accordion` · sticky CTA on mobile (CSS) |
| 4 | About | `text-scrub` (4.1) · `data-reveal="clip"` vision/mission · `route-steps` with 2 stops (4.4) |
| 5 | Contact | `form-flight` · `data-magnetic` quick-contact buttons |
| all | Global | Lenis · flight rail · view transitions |

## Later (WaysZ Visa, separate repo)
Copy `src/motion`, `src/styles`, `src/components/Logo.astro` and this skill. Add `data-site="visa"` on
`<html>` (sky accent). Legal notices there are static.
