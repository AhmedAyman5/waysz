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

### areas — Home §1.3 (`views/home/Areas.astro`)

```html
<section class="areas" data-scene="areas" data-waypoint>
  <div class="areas__view" data-depth-scene>
    <div class="areas__stage stage-host"></div>            <!-- WebGL act "wipe" -->
    <header class="areas__intro"><h2 class="areas__title">…</h2></header>
    <article class="area theme-dark" data-side="left|right" style="--hue; --justify; --focus">
      <div class="area__media"><div class="area__photo" data-depth="0.35"><Image data-focus /></div></div>
      <div class="area__scrim"></div>
      <div class="area__body"><div class="area__text"><svg class="area__icon"/><h3 class="area__name"/><p class="area__copy"/><a class="area__link"/></div></div>
    </article> ×4
    <div class="areas__ticks"><span/>×4</div>
  </div>
</section>
```

One sticky screen, 4.4 "units" of scroll: title on the page colour (we are still in the cloud) → each area in
turn, resting between transitions. WebGL tiers: cloud wipe · liquid displacement · light sweep · iris
(`wipe.glsl.ts`); css tier: clip-path wipes of the same `<img>`s. Photos never mirror — `data-side` says where
the text goes. No JS: stacked full-screen cards.

### media-reveal — Home §1.4 (`views/home/Why.astro`) · About §4.1

`.why__track > .why__view (.reveal__media > .reveal__inner, .why__shade, .reveal__text) + .why__list > .reason[data-icon]`.
The media opens from a cabin-window shape to full screen; the heading travels from the middle of the window
to its place; then the `.reason` items arrive, each icon with its own movement (`iconTimeline`). Wide + tall
screens: all inside one sticky screen, scrubbed. Small screens: reveal scrubbed, items enter while scrolling
over the held photo.

### globe-route — Home §1.5 (`views/home/How.astro`)

`.how__track > .how__view (.how__poster, .how__stage.stage-host, .how__scrim) + .how__content (.how__title, .how__route > .how__line + ol.how__steps > .step)`.
The plane flies three hops across the night globe (act "globe") and each `.step` gets `.is-active` when the
plane reaches its stop; the HTML line + plane under the steps mirrors it (and is the whole route on the css
tier, over the still `earth-poster.webp`). Wide: sticky screen with rests at each stop. Small: the globe holds
the top of the screen, the steps scroll over it. Waiting steps are dimmed to 0.62 (still AA).

### approach — Home §1.6 (`views/home/Cta.astro`) · reuse for Contact §5

Photo settles as the section arrives (scale + y, scrubbed), headline rises by words once, CSS-animated
approach lights (`.cta__lights span`, perspective from `--i`) run only while `.is-live`. Buttons: `data-magnetic`.

### boarding-pass — Home §1.7 (`views/home/Visa.astro`)

`.pass__scroll` (scroll tilt: rotationX 46° → 0) > `.pass__shadow` + `.pass.theme-light[data-site=visa]`
(pointer tilt + `.pass__shine`) with `.stamp` (lands once, small impact). The notches are a CSS mask, so the
shadow is its own layer.

### footer-landing — every page

Runway centre line decelerates with the last stretch of scroll (scrubbed), threshold lights come on, the logo
wings rise and the plane comes down onto its spot. The legal notice is never animated.

### page-hero — Immigration hero (`views/immigration/Hero.astro`) · reuse for any group / inner page

`.phero > .phero__sticky (.phero__window > .phero__plate[data-depth] > BgVideo + .phero__scrim) + .phero__content (crumb, h1[data-intro], lead, actions)`.
165lvh section with a sticky screen (no pin): headline by words on load; scrolling closes the footage into a
cabin-window shape that sinks into the night. The next section overlaps the last 34lvh.

### journey-route — Immigration "the journey" (`views/immigration/Journey.astro`)

`.journey__route > svg.journey__sky (path.journey__ghost + path.journey__trail) + .journey__plane + ol.journey__stops > li.stop[style="--x; --y"]`.
No pin, no sticky. The SVG is stretched over the route box (`preserveAspectRatio="none"`), so the plane is an
HTML element placed from the path's own points; stops sit ON the path (keep `STOPS` and `PATH` in sync) and
light up (`.is-active`) when the plane passes; icons draw once. RTL mirrors the SVG. Small screens: vertical line.

### dossier — Immigration services (`views/immigration/Services.astro`)

`.dossier > .dossier__view (.dossier__head + ul.dossier__track > li.sheet.theme-light)`. Wide: CSS sticky screen +
one scrubbed trigger slides the track (× `env.dir`); the section's height is set from the track's width on
every refresh. Sheets tilt and sit low at the edges, settle upright in the middle; a focused link scrolls its
sheet to the middle. Small screens / no JS: a plain grid of sheets.

### explore-globe — Immigration "Explore the world" (`views/immigration/Explore.astro`)

`.explore > .explore__head (h2, lead, .combo: input[role=combobox] + ul[role=listbox]) + .explore__globe (.explore__poster, .explore__stage.stage-host, .explore__pad, .explore__tip, .explore__zoom) + .explore__foot > .explore__msg[aria-live] > .explore__card`.
The scene owns the combobox, the pointer on `.explore__pad` (`touch-action: pan-y`: horizontal drag rotates,
vertical drag scrolls the page; tap / click selects; ctrl + wheel or the buttons zoom) and the welcome message
(DOM, words only). The act `explore` draws the globe and is driven through `ExploreControls`
(`pick · hover · drag · release · zoom · flyTo · setAuto · setLayout`). Borders + act load at `top 250%`.
css tier / reduced motion: `earth-borders-poster.webp` + the same list and message, no flight. `.is-live` on the
section = the globe is interactive. Selecting a country also fills `[data-destination-chip]` and adds
`?destination=<ISO>` to `a[data-consult]` anywhere on the page.

### code-hero — Software hero, "Code in flight" (`views/software/Hero.astro`)

`.chero > .chero__sticky (.chero__media > .chero__plate > BgVideo + .chero__scrim, .chero__codebox > pre.code, .chero__stage.stage-host, .chero__content (crumb, h1[data-intro], lead, actions))`.
180lvh section with a sticky screen (no pin). Entrance on every tier: the characters of the code (DOM spans; whole
tokens on small screens) fly in from depth and land, the headline rises by words; lead + buttons are never hidden.
When it has settled (`bridge.code.settled`) the act `glyphs` takes over on the WebGL tiers: the scene measures every
character (`measureCode`) and the act lands one instanced glyph on each, adds the swarm and the pointer field, and
flies the code away with `bridge.code.leave` (scroll, reversible). css tier: the lines lift off as DOM elements.
The backdrop shader repeats the plate box (`--plate-top`, `--plate-h`) and the three layers of `.chero__scrim` —
change them together. `<Code lines>` renders any decorative code block (LTR, aria-hidden, tokens with `data-col`).

### code-forge — Software services (`views/software/Services.astro`)

`.forge > .forge__view (.forge__head (h2, .forge__ticks) + ul.forge__list > li.svc[data-fx] (.svc__text + .svc__fx > .win (.win__bar, .win__code > .win__run + pre.code, .win__out > .mock)))`.
One paused timeline per service, driven only by scroll: the code assembles from flying characters, a highlight walks
down its lines, and the result builds itself from the parts marked `data-pop · data-grow · data-from="x,y,rot" ·
data-dim · data-hide · data-stroke` (in DOM order, or at `data-t`); `{{bad|good}}` in a code line makes characters
that fly out and get replaced. Wide: CSS sticky screen (`.is-scrub`, height from `--n`), the services take turns
(opacity, never visibility); the first code assembles while the section arrives. Small: each window is scrubbed as
it crosses the screen. The timelines are built only when the section is near (one per frame): nothing at page load.
No JS / reduced motion: a list, every window finished.

### build-steps — Software "how we work" (`views/software/Process.astro`)

`.steps > .steps__media[data-depth] + .steps__scrim + .steps__content (.steps__head, .steps__route > .steps__line > .steps__fill + ol.steps__list > li.bstep (.bstep__node, num, name, text, code.bstep__call))`.
No pin. The line fills with scroll (horizontal on wide screens, growing from the reading side; vertical on small
ones); a step gets `.is-active` when the line reaches it and its decorative call types in once (ScrambleText, Latin).

### ask-box — Software closing box (`views/software/Missing.astro`)

Once in view: the box settles, its line of code types in (ScrambleText, Latin), the heading rises by words.

### destinations (Motion Lab) — sticky cards that stack

Kept for the Motion Lab; Home uses `areas`.

### route-steps — Service template steps · About §4.4 (Home uses `globe-route`)

Existing contract (route path + `.route__plane` + `.step.is-active`). v2: optional map/photo background
behind the route; the plane may be a `<Lottie mode="loop">` inside `.route__plane`.

### boarding-gate (Motion Lab)

`.pass` + `path.pass__perf` + `.stamp`. Home uses `boarding-pass`.

### text-scrub · services-filter · accordion · form-flight

Unchanged (see Motion Lab).

---

## Page storyboard v2 (waysz.org)

| Brief § | Section          | Media                                                                   | Motion                                                                |
| ------- | ---------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| —       | Intro            | logo                                                                    | `preloader` (unchanged)                                               |
| 1.1     | Header           | —                                                                       | transparent over the hero, dark glass after 80px · «خدماتنا» submenu  |
| 1.2     | Hero             | wing-view video at dusk inside the WebGL stage + shader clouds          | `hero-takeoff` (sticky, scrubbed) · stage act `flight` — BUILT        |
| 1.2b    | The Journey      | window-seat take-off sequence, dusk grade                               | `image-sequence` (pin 1) + 3 captions · cloud fly-through — BUILT     |
| 1.3     | 4 service areas  | photo per area (justice, terminal at sunset, auditorium, code), graded navy/amber | `areas` (sticky) · stage act `wipe` (4 shader transitions) · SVG icons — BUILT |
| 1.4     | Why WaysZ        | dusk sky above city lights                                              | `media-reveal` (sticky) → 6 reasons with icon micro-animations — BUILT |
| 1.5     | How we work      | NASA Black Marble globe (stage act `globe`) · still for the css tier     | `globe-route` (sticky) · HTML route line + steps — BUILT              |
| 1.6     | CTA              | runway at dusk (photo)                                                  | `approach` · CSS approach lights · `data-magnetic` — BUILT            |
| 1.7     | WaysZ Visa link  | terminal at sunset (photo)                                              | `boarding-pass` (3D tilt + SVG stamp) — BUILT                         |
| 1.8     | Footer           | logo                                                                    | `footer-landing` (runway + touchdown) — BUILT                         |
| 2       | Services         | header photo per area tab                                               | `services-filter` (Flip) · cards with photos                          |
| 2.2     | Immigration group page | dusk window-seat video · borders globe (act `explore`)            | `page-hero` · `journey-route` · `dossier` · `boarding-pass` · `explore-globe` · `approach` — BUILT |
| 2.4     | Software group page | dusk city video inside the stage (act `glyphs`) · code photo         | `code-hero` · `code-forge` · `build-steps` · `ask-box` · `approach` — BUILT |
| 3       | Service template | header photo of the service's area                                      | `data-split` · `route-steps` · `accordion`                            |
| 4       | About            | wide photo                                                              | `media-reveal` · `text-scrub` · `route-steps` (2 stops)               |
| 5       | Contact          | calm photo                                                              | `form-flight` · `data-magnetic`                                       |

Pins: Home may use 3 and uses 1 — `image-sequence` (1.2b). The hero, `areas`, `media-reveal` and `globe-route`
are CSS sticky + scrub, not pins. Other pages: max 2.

## What to reuse on the next pages

| Need                                   | Take                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| Services: header photo per area tab    | the `wipe` act (pass the tab photos; set `bridge.areas.progress` from the tab index)   |
| Service template: steps                | `globe-route`'s HTML line + `.step.is-active` (without the globe) or `route-steps`     |
| About: opening                         | `media-reveal` as is (`.reveal__media`, `.reveal__text`, optional `.reason` items)     |
| About: values / "why" lists            | `iconTimeline` icons from `media-reveal.ts`                                            |
| Contact: header                        | `approach` (photo + words + magnetic buttons)                                          |
| A block of decorative code             | `views/software/Code.astro` + `splitChars` / `measureCode` in `motion/code-glyphs.ts`  |
| A result that builds itself on scroll  | the `data-pop / grow / from / dim / hide / stroke` parts of `code-forge` (`buildTimeline`) |
| Any dark photo section                 | `data-depth-scene` + `data-depth` on the photo wrapper, scrim gradient, `.link-arrow`  |
