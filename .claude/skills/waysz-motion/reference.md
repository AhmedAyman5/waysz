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
- `full` (WebGL): video + clouds + rays are drawn by the stage (`.is-live` hides `.hero__media`).
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
turn, resting between transitions. With WebGL: cloud wipe · liquid displacement · light sweep · iris
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
css tier (no WebGL): `earth-borders-poster.webp` + the same list and message, no flight. `.is-live` on the
section = the globe is interactive. Selecting a country also fills `[data-destination-chip]` and adds
`?destination=<ISO>` to `a[data-consult]` anywhere on the page.

### code-hero — Software hero, "Code in flight" (`views/software/Hero.astro`)

`.chero > .chero__sticky (.chero__media > .chero__plate > BgVideo + .chero__scrim, .chero__codebox > pre.code, .chero__stage.stage-host, .chero__content (crumb, h1[data-intro], lead, actions))`.
180lvh section with a sticky screen (no pin). Entrance with or without WebGL: the characters of the code (DOM spans; whole
tokens on small screens) fly in from depth and land, the headline rises by words; lead + buttons are never hidden.
When it has settled (`bridge.code.settled`) the act `glyphs` takes over when WebGL is on: the scene measures every
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
No JS: a list, every window finished.

### build-steps — Software "how we work" (`views/software/Process.astro`)

`.steps > .steps__media[data-depth] + .steps__scrim + .steps__content (.steps__head, .steps__route > .steps__line > .steps__fill + ol.steps__list > li.bstep (.bstep__node, num, name, text, code.bstep__call))`.
No pin. The line fills with scroll (horizontal on wide screens, growing from the reading side; vertical on small
ones); a step gets `.is-active` when the line reaches it and its decorative call types in once (ScrambleText, Latin).

### ask-box — Software closing box (`views/software/Missing.astro`)

Once in view: the box settles, its line of code types in (ScrambleText, Latin), the heading rises by words.

### legal-thread — Legal page, the 3D scales behind every section (`views/LegalPage.astro`)

`.legal.theme-dark > .legal__stage.stage-host[data-scene=legal-thread] + .legal__body > section[data-shot] × 7`.
The host is `position: sticky` for the whole page (the body starts with `margin-block-start: -100lvh`), so ONE act
(`justice`) draws behind every section. The scene only measures: which `[data-shot]` section the middle of the
screen is in and how far (`bridge.justice.shot` → camera), the dip of light at the cut into the colonnade (`veil`)
and whether the consult section has arrived (`final` → the last weight → perfect balance). All of it is a function
of the scroll position, so it reverses. Section order is fixed: hero · services · colonnade · why · how · faq · consult.
css tier (no WebGL) / no JS: `.scales-still` images (our render: `node scripts/render-scales-still.mjs`);
they fade out while `.legal__stage.is-drawing`. Text always sits on a DOM scrim, never on the bare canvas.

### legal-hero · legal-weights · legal-colonnade · legal-why · legal-how · legal-faq · legal-consult

- **legal-hero** (`views/legal/Hero.astro`): 170lvh, sticky screen. Nothing is hidden on load (the headline is the
  LCP on phones): its two lines settle with a transform; scroll lets the text leave while the camera orbits.
- **legal-weights** (`views/legal/Services.astro`): `.lsvc-sec > .lsvc__view (.lsvc__head (h2 + .lsvc__tray > button.lsvc__tick) + ul.lsvc__list > li.lsvc[data-fx] (.lsvc__fx > svg + .lsvc__text))`.
  Sticky screen on every screen size; the services take turns and `bridge.justice.count` says how many weights are
  on the pan; hover / focus on a tray button sets `justice.focus` (that weight drops early), click scrolls to it.
  Each `data-fx` (beam · gather · warm · sign · status · merge) has one paused timeline built in `moment()`.
  `path[data-engrave]` is also what the act engraves on that service's weight.
- **legal-colonnade** (`views/legal/Help.astro`): sticky screen; `bridge.justice.walk` walks the camera between the
  columns and each `.lhelp__item[data-side]` gets a beat from the side of its column (× `env.dir`).
- **legal-why**: heading by words, four reasons, the sealed file `.file[data-spotlight]` (covers open only inside the
  pointer's light through a CSS mask on `--mx / --my`; a slow CSS sweep on touch). **legal-how**: the `build-steps`
  line without the code calls. **legal-faq**: runs beside `accordion`; makes closed answers `inert` (they hold links).
  **legal-consult**: heading by words; the balance is the thread's work.

### events-thread — Events page, the theatre behind every section (`views/EventsPage.astro`)

`.gala.theme-dark > .gala__stage.stage-host[data-scene=events-thread] (.gala__still--curtain, .gala__still--hall) + .gala__body > section[data-shot] × 11`.
Same pattern as `legal-thread`: the host is sticky for the whole page and ONE act (`gala`) draws behind every section.
The thread writes `gala.shot` (section + progress → camera node), `open` (the hero's sticky progress draws the curtain),
`carpet` (unrolls ahead of the walk: services → expo → arrivals → down the aisle), `flashes`, `led` and `veil` (the dip
that hides the two camera cuts: hero → foyer, foyer → stage). Section order is fixed: hero · services · expo · arrivals ·
register · interpret · types · roof · how · faq · consult. css tier / no JS: two stills of our own render (closed curtain,
the hall: `node scripts/render-gala-still.mjs`), swapped by `.is-hall`, faded while `.is-drawing`.

### events-hero · events-program · events-expo · events-arrivals · events-badge · events-interpret · events-types · events-roof · events-how · events-faq · events-consult

- **events-hero** (`views/events/Hero.astro`): 270lvh sticky; title + lead centred in the follow spot ON the closed
  curtain, painted at once (LCP); the text leaves while the curtain opens; camera: seats → over the hall → to the stage.
- **events-program** (`Services.astro`): the ten cards in two walking columns; per card once: a light sweep, the gold rule,
  the icon draws. The cards themselves never move (the even column has a CSS offset).
- **events-expo** (`Expo.astro`): sticky (the view and the text are two sticky layers on wide screens; the text scrolls over
  the view on small ones). Progress → `gala.plan` then `gala.booths` (0…`GALA_BOOTHS`). Legend link hover / focus →
  `gala.booth`; the act raycasts the four labelled stands and calls `gala.onHover`. css tier: an SVG plan fills in.
- **events-arrivals** (`Arrivals.astro`): split-flap board (decorative). Latin: one tile per character (padded widths);
  Arabic: one tile per WHOLE word. Each flip = four clipped layers (static top / bottom, falling old top, rising new
  bottom). Boots once, then the status column flips by scroll stage (`data-states`); a running cell finishes before a new flip.
- **events-badge** (`Register.astro`): progress → `gala.badge`, `gala.scan`, `gala.seats` (seats stay lit afterwards).
  `.greg__pad` (touch-action: none, only over the badge) → `gala.grab` (host NDC). css tier: HTML badge, elastic swing.
- **events-interpret** (`Interpret.astro`): two beats in one sticky screen (opacity, `.is-active`): sound waves
  (`gala.waves`) + an SVG headset + a sentence that turns AR ↔ EN by whole words (loop only while on screen); then the LED sweep.
- **events-types** (`Types.astro`): staircase progress (a rest on each type) → `gala.turn` (0…7) turns the turntable; the
  DOM type at the front by opacity; `path[data-engrave]` is engraved on its medallion.
- **events-roof** (`Roof.astro`): wide: sticky, four corner labels (links) + `gala.beams` (the four beams meet on the stage);
  css tier: SVG lines draw instead. Small: a grid of labels, beams while the section passes.
- **events-how**: tickets (audiences) once + the `build-steps` line. **events-faq**: like `legal-faq`.
- **events-consult** (`Consult.astro`): sticky progress → `gala.final`: the spots converge, the curtain closes (0.1 → 0.9),
  applause flashes. The act multiplies the curtain's `open` by the finale, so scrolling back opens it again.

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
| 2.1     | Legal group page | 3D scales, colonnade and dusk light in the stage (act `justice`, dusk HDRI) · still for the css tier | `legal-thread` · `legal-hero` · `legal-weights` · `legal-colonnade` · `legal-why` · `legal-how` · `legal-faq` · `legal-consult` — BUILT |
| 2.3     | Exhibitions & Conferences group page | a procedural theatre in the stage (act `gala`): velvet curtain, hall, LED wall, turntable, expo, red carpet, badge · two stills of our own render for the css tier | `events-thread` · `events-hero` · `events-program` · `events-expo` · `events-arrivals` · `events-badge` · `events-interpret` · `events-types` · `events-roof` · `events-how` · `events-faq` · `events-consult` — BUILT |
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
| A solid 3D model in the stage          | the render-target pattern of `acts/justice.ts` (`prepare` + `prerender`), its spring physics and camera nodes |
| A cloth / curtain in 3D                | `curtainVertex` in `shaders/gala.glsl.ts` (pleats + analytic normal + hem lag) — no CPU physics |
| Bloom without an extra pass            | the `gala` render target: `generateMipmaps` + `LinearMipmapLinearFilter`, `textureLod` taps in the finish shader |
| A grabbable 3D object on a rope        | the badge in `acts/gala.ts`: verlet rope in camera space + a hinged card, a DOM pad that sends the pointer through the bridge |
| A drawn moment that plays with scroll  | `moment()` in `legal-weights.ts` (one paused timeline per `data-fx`)                   |
| Any dark photo section                 | `data-depth-scene` + `data-depth` on the photo wrapper, scrim gradient, `.link-arrow`  |
