# WaysZ Home — Creative Treatment ("The Journey")

Status: **approved 2026-11-12.** Covers the whole Home page (brief §1.1–1.8).
Part 1 (§1.1, §1.2, §1.2b + the shared foundation) and Part 2 (§1.3–1.8) are **built** — the whole Home
page. The storyboard below is as built; §12 lists what changed from the plan and the measurements.

## 1 · The idea in one paragraph

The Home page is one continuous flight filmed at golden hour. The logo intro takes off; the curtain
lifts and we are already in the air, looking out over the wing at a warm horizon. We scroll: the
camera pushes into the clouds, comes out over a runway at dusk, and we watch a real take-off while
three short lines say how WaysZ works with you (seen from the window seat, the same seat as the hero). We climb through the cloud layer, cruise past four
"destinations" (the service areas), see the route drawn across the night side of the Earth, and
descend toward the runway lights — the call to contact us. The footer is the landing: the logo
re-assembles and the plane parks.

**One visual language holds it together:** real footage and photos sit *inside* a single WebGL stage
that adds what footage cannot — light (god rays, an amber sun that follows the pointer), atmosphere
(shader clouds that the camera flies through between scenes), and film finish (grain, vignette).
Navy (`--color-brand`) is the night, amber (`--color-accent`) is the sun and the plane. Nothing
bounces, nothing is a toy: movements are slow, heavy and eased like a camera on a crane.

## 2 · Scroll storyboard

| §    | Scene                 | What the visitor sees and feels                                                                                                                                                                                                                                                                                                                             | Media / tech                                                                                                                                                              | Pin |
| ---- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| —    | Intro                 | Logo "Take-off" preloader — **unchanged**. Its curtain lifts onto the hero that is already rendered.                                                                                                                                                                                                                                                         | existing `preloader`                                                                                                                                                      | —   |
| 1.1  | Header                | Transparent over the sky; turns into dark glass after 80px; hides on scroll down. "خدماتنا" opens the four areas. Mobile: full-screen menu, links rise by line.                                                                                                                                                                                              | `headerOverlay`, existing `header.ts`                                                                                                                                     | —   |
| 1.2  | Hero — "In the sky"   | Window-seat view: wing, soft clouds below, the sun on the horizon. The headline is huge and rises word by word from a mask; lead + two buttons follow. Moving the mouse shifts the view in depth (wing / far clouds / near wisps) and drags a warm light across the scene. Scrolling pushes the camera forward: near clouds rush past and fill the screen.     | 01 hero video as a WebGL texture + shader cloud layers + god rays + grain/vignette · SplitText (words) · magnetic buttons                                                 | no (sticky CSS, scrubbed) |
| 1.2b | The Journey           | Out of the white: the runway at dusk, seen from the window seat over the wing. Scroll plays the take-off frame by frame: the ground rushes by, the plane rotates, the airport falls away. Three captions from the brief's intro paragraph appear one at a time (listen → guide → accompany). Light streaks grow with speed. At the end we climb into the cloud deck and the screen clears into the light page below. Link: "تعرّف علينا أكثر". | image sequence (WebP frames) drawn as a texture in the same WebGL stage · shader cloud fly-through · css tier: 2D canvas + the 03 cloud photos as layers | **1** |
| 1.3  | Four destinations     | Still inside the cloud we climbed into: the section title on the page colour. The cloud parts and the first area appears; each next area arrives through a different transition (liquid front, band of warm light, iris), resting in between. Area name huge, the brief's copy, one link, a line icon that draws itself in the area hue. Pointer moves the photo in depth. | 4 photos as textures in the WebGL stage (act `wipe`, 4 shader transitions) · css tier: clip-path wipes · `areas` scene · own SVG icons | no (sticky) |
| 1.4  | Why WaysZ             | A cabin-window-shaped view of the dusk sky above city lights opens to the full screen; the heading travels from the middle of the window to its place. The six reasons settle in two calm rows, each icon with its own small movement (roof drops, check lands, lock closes, globe turns, rings join). Phone: the photo stays and the reasons scroll over it. | `media-reveal` · one photo · own SVG icons (DrawSVG + transforms) | no (sticky) |
| 1.5  | How we work           | Night side of the Earth with warm city lights. A route leaves Egypt; scrolling flies the plane through four stops, the globe turns to follow it, and the four steps light up one by one along a line that mirrors the route. Faint arcs leave Egypt in other directions. | three.js globe (act `globe`) with NASA Black Marble · `globe-route` · css tier: a still of the same globe + the HTML route line | no (sticky) |
| 1.6  | CTA — "Final approach" | Descent: a real runway at dusk comes up to meet us; the sequenced approach lights run toward the horizon where the buttons sit. Headline by words; magnetic buttons; WhatsApp only if `site.whatsapp` exists. | one photo · CSS approach lights · `approach` · `data-magnetic` · `data-depth` | no  |
| 1.7  | WaysZ Visa            | In the terminal at sunset a boarding pass "WaysZ → WaysZ Visa" rises from flat to face us, leans toward the pointer, and gets stamped (in the Visa site's blue). One button to `site.visaSite`. | `boarding-pass` · one photo · own SVG stamp | no  |
| 1.8  | Footer — "Landed"     | Touchdown: the runway centre line streaks past and brakes to a stop with the last scroll, the threshold lights come on, the logo wings rise and the plane comes down onto its spot. Legal notice is static — never animated. | `footer-landing` | —   |

One real pin (the Journey). The hero, the four areas, "why" and "how" hold the screen with CSS `position: sticky`
+ a scrubbed ScrollTrigger, which is lighter and cannot break on resize. Budget on Home stays 3.

### Copy used in Part 1 (from the brief, nothing invented)

- Headline: «طرق متعددة.. ووجهة واحدة لكل ما تحتاجه» → EN "Many ways. One destination for everything you need."
- Lead: brief §1.2 «النص الفرعي» (full sentence, both languages).
- Buttons: «اطلب استشارة» / «استعرض خدماتنا».
- Journey captions = the §1.2 «فقرة تعريفية», cut at its own punctuation, no rewording:
  1. «WaysZ مؤسسة متعددة الخدمات، تقدم حلولًا عملية ومتكاملة للأفراد والشركات والجهات.»
  2. «نؤمن بأن الخدمة الجيدة تبدأ من الفهم الصحيح لاحتياجك؛ لذلك نستمع إليك أولًا،»
  3. «ثم نرشدك إلى المسار الأنسب، ونرافقك حتى إتمام طلبك.» + link «تعرّف علينا أكثر»

## 3 · Global experience layer

- **WebGL stage** — one fixed full-viewport canvas behind the content, one renderer per page. Sections
  register "acts" (hero sky, journey, later globe / approach lights); only the act on screen renders.
- **Plane cursor** (desktop, fine pointer): logo plane in amber, rotates toward movement, grows on
  links, shows a label on `[data-cursor]`.
- **Lenis** smooth scroll (already there) on `gsap.ticker`.
- **Flight progress** — the existing flight rail becomes the flight-progress indicator: plane on a
  dashed line with one tick per section; mobile gets a 2px amber progress line under the header.
- **Grain + vignette** — in the shader on high tier, a tiny tiled noise PNG via CSS on low tier.
- **Pointer light** — the amber sun glow follows the pointer inside dark sections (extends `data-spotlight`).
- **Magnetic buttons** (existing) on the primary CTAs only. Native view transitions stay as they are.
- ScrambleText is not used on Home (Arabic first); it stays allowed for Latin-only labels elsewhere.

## 4 · 3D layer — architecture and tiers

`src/motion/stage/` — `stage.ts` (renderer, ticker, visibility, watchdog, dispose), `tier.ts`,
`bridge.ts` (scroll state shared with the DOM scenes), `acts/*.ts` (one module per scene), `shaders/*.glsl.ts`.

- Created lazily: after `waysz:intro-done`, once the hero text is on screen, on the first interaction;
  `three` is a dynamic import, so it is never in the initial bundle.
- Driven by `gsap.ticker` (no second RAF). Rendering stops when the active act is off-screen
  (IntersectionObserver) or `document.hidden`.
- Disposal on `pagehide`: geometries, materials, textures, `renderer.dispose()`, `forceContextLoss()`;
  ticker callbacks removed. `webglcontextlost` → the DOM version takes over; nothing breaks.

**Tiers are chosen by what the device can do — never by "mobile".** Most of our audience is on phones,
so a capable phone gets real WebGL:

| Tier     | Who gets it                                                                                                      | Hero                                                                                  | Journey                                                    |
| -------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **high** | desktop-class device (≥ 1024px + fine pointer) with WebGL2, a hardware GPU, ≥ 4 cores                            | video texture + 3 shader cloud layers (5 noise octaves) + god rays + grain · DPR ≤ 1.5 | frames as texture + streaks + cloud fly-through            |
| **lite** | capable phones / tablets / touch laptops: WebGL2, hardware GPU not on the weak list, ≥ 4 cores, ≥ 4 GB if reported | same scene, cheaper: 2 cloud layers (3 octaves), sun glow instead of rays · DPR ≤ 1.25 | same, with the lighter portrait frame set (70 frames)      |
| **css**  | weak GPU (old Adreno/Mali/PowerVR, software rendering), no WebGL2, < 4 cores, < 4 GB, `saveData`                 | plain `<video>` + 2 cloud photo layers + CSS veil                                     | 2D-canvas sequence + CSS veil                              |
| static   | reduced motion, or JS off                                                                                        | poster image, text in final state                                                     | first frame, all captions visible, no pin                  |

- A watchdog measures real frame times: two slow windows in a row → `high → lite → css` for the rest of
  the visit. So a device that was judged too optimistically still ends up smooth.
- The HTML always contains the poster / first frame and the full text, so LCP, no-JS and reduced
  motion never depend on WebGL. The hero lead and buttons are painted at once and never hidden.

## 5 · Media audit of `media-inbox/` (checked frame by frame)

| File                         | Finding                                                                                                                                              | Plan                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 01 hero clouds (7.8s, 24fps) | Clean. Winglet is plain navy/white, no logo or text. Cool blue grade.                                                                                 | Slow to ~15s (motion-interpolated), cross-fade loop, warm grade toward amber. Desktop + mobile + poster.          |
| 02 takeoff (8.1s, 60fps)     | **Problem ×3:** readable "vistara" on the fuselage + tail logo; flat grey haze (not golden hour); the plane is only ~18% of the frame width.           | **Dropped (decision A).** Replaced by Pexels 3723453: a 4K window-seat take-off with no branding anywhere, stabilized and graded to dusk. |
| 03 clouds ×3                 | Clean, large (5–7k px). Daylight white/blue.                                                                                                          | Luminance-key to alpha, tint warm, export 3 WebP layers ≤ 2000px for the fly-through and low-tier hero.           |
| 04 legal ×2                  | Clean (statue, gavel, book). Bright studio backgrounds.                                                                                               | Part 2. Grade darker/navy. **Only 1170–2054px wide** (Unsplash preview size).                                     |
| 05 passport                  | Cover shows "PASSPORT" + the US national seal (dim). Not a brand, but it reads as a US passport.                                                      | Part 2. Decision C.                                                                                               |
| 05 airport terminal          | Small anonymous silhouettes; wayfinding signs; a poster/advert on the right edge.                                                                     | Part 2. Crop the right edge, darken.                                                                              |
| 06 auditorium                | **Brand + faces:** "PRODUCT CON" on stage and speaker portraits on the screen.                                                                         | Skip, or crop to the audience/ceiling only. Prefer a replacement.                                                 |
| 06 exhibition hall           | **Brands:** "SIMON & SCHUSTER", "FRANCE", "estonia" stands; recognisable people in the foreground.                                                     | Skip. Replacement needed (wide, dark hall, no readable stands).                                                   |
| 07 code ×2                   | No logos readable. Editor UI is generic. One is portrait 687px wide.                                                                                  | Part 2. Use the landscape one; re-download larger.                                                                |
| 08 Lottie ×4 (listed)        | Vector only, no embedded images, 8–102 KB — inside budget.                                                                                            | Ship `plane` + `visa-stamp` when used; others in Part 2.                                                          |
| 08 `Justice_Scales_Animation_v1.json` | **No source URL was given** (file metadata says it was made with "Frolic").                                                                  | Not shipped until its URL/license is known. Decision D.                                                           |

All Unsplash files are low-resolution AVIF previews. For Part 2 I will re-download the same photos
at 2400px from Unsplash (same license) into `media-inbox/`.

## 6 · External assets I plan to download

| Asset                                             | Source                               | License                      | Used in | Part |
| ------------------------------------------------- | ------------------------------------ | ---------------------------- | ------- | ---- |
| Golden-hour take-off clip (replacement for 02)    | Pexels (or Mixkit "Free License")    | Pexels License / Mixkit Free | 1.2b    | 1    |
| Earth night lights "Black Marble" + day texture   | NASA Visible Earth                   | Public domain                | 1.5     | 2    |
| Same Unsplash photos at 2400px                    | Unsplash                             | Unsplash License             | 1.3     | 2    |
| Replacement events photo, "why" wide photo, CTA dusk clip | Pexels / Unsplash            | Pexels / Unsplash License    | 1.3–1.6 | 2    |
| Lottie icons for events + software                | LottieFiles (free)                   | Lottie Simple License        | 1.3     | 2    |
| Airliner 3D model (optional, only if unbranded)   | Sketchfab CC0 / CC-BY, or Poly Haven | CC0 / CC-BY (credited)       | 1.2b    | 1–2  |

No HDRI is needed: the sky is footage + shader. Every shipped file gets a row in `docs/media-credits.md`.

## 7 · Performance plan

- **Initial load (before any scroll):** HTML + CSS + 3 font files + core JS + hero poster (≤ 90 KB WebP,
  `fetchpriority="high"`, the LCP element on repeat visits). Target ≤ 0.6 MB before the video starts.
- Hero video `preload="none"`, starts after the intro; desktop ≤ 3 MB, mobile ≤ 1.2 MB.
- `three` (own chunk, ~170 KB gzip with only the classes we import) + shaders load on the first interaction, never during page load.
- Journey frames: frame 1 in HTML; the rest only when the section is within one viewport, in order;
  ≤ 150 frames, ≤ 60 KB each, mobile loads every 2nd frame. `lottie-web` loads only near a `[data-lottie]`.
- Budget check: desktop initial ≤ 4 MB, mobile ≤ 2 MB. Lighthouse mobile ≥ 75 / A11y ≥ 95 / SEO ≥ 95, LCP ≤ 2.5s.
- Scroll smoothness: only transforms/opacity/clip-path/canvas; one RAF; shader clouds are cheap layered
  noise (no ray-marching) at ≤ 1.5 DPR; automatic downgrade high → low when frames get slow.

## 8 · Accessibility and content safety

- Canvas, videos, cloud layers: `aria-hidden`. All copy is real HTML above them.
- Text over media always on a dark gradient scrim (AA measured on the brightest frame).
- Arabic is split by words/lines only. Horizontal motion × `env.dir`. Footage, photos and logo never mirror.
- Reduced motion: final states, poster, no pin, no 3D, no cursor. JS off: same, via HTML/CSS only.
- Legal notice and form consent text are never animated.

## 9 · Rule updates that ship with Part 1

`CLAUDE.md`, `waysz-motion` and `waysz-media` are updated for the approved changes: three.js + addons
and custom GLSL allowed; all GSAP plugins (ScrambleText Latin-only); dependencies three / lottie-web /
playwright (dev); extended asset sources incl. Unsplash, Poly Haven, Kenney, NASA, Sketchfab CC0/CC-BY;
3 pinned scenes on Home; Motion Lab optional for Home; Lighthouse mobile Performance ≥ 75; storyboard v2
without the old "dive" scene.

## 10 · Decisions (team lead, 2026-11-12)

- **A — Take-off footage:** 02 dropped. I vetted 9 Pexels clips (Mixkit's take-off clips are under its
  Restricted License, so not allowed). No clean golden-hour take-off exists there in usable quality: the only
  true sunset one is 720p handheld. Chosen: Pexels 3723453 — one continuous 4K shot from the window seat, no
  livery, logo or registration in frame — stabilized, cropped and graded from overcast to dusk. It also
  matches the hero (same seat, same wing-view language).
- **B — 3D aircraft:** optional, not added in Part 1. Nothing unbranded and premium was available without
  a Sketchfab login; the page is complete without it. Revisit in Part 2 only with a specific CC0/CC-BY model.
- **C — Passport photo:** replace with a generic travel shot (Part 2).
- **D — Justice-scales Lottie:** replace with a credited free LottieFiles animation (Part 2).
- **E — Events photos:** replace both (Part 2).
- **Unsplash:** re-download the kept photos at 2400px (Part 2).
- **Tiers:** by device capability, not by "mobile" (§4).

## 11 · Part 1 as built — measured

Production build, local preview, 2026-11-13 (scripts in `scripts/`):

| Metric                                        | Desktop 1440×900 (high)       | Phone 390×844 (lite)       |
| --------------------------------------------- | ----------------------------- | -------------------------- |
| Loaded by itself (no interaction)             | 670 KB                        | 436 KB                     |
| After the first interaction (WebGL chunk)     | 803 KB                        | 569 KB                     |
| After scrolling the whole page                | 5.0 MB (140 frames stream in) | 1.9 MB (70 frames)         |
| Scroll frames, no throttling                  | none over 33ms                | none over 33ms             |
| Scroll frames, CPU 4× throttling              | median ≈ 45ms · p95 ≈ 120ms   | median ≈ 25ms · p95 ≈ 75–100ms |

Lighthouse mobile, four runs: Arabic 80 and 85 · English 81 and 82 · Accessibility 100 · Best practices 100 ·
SEO 100 · LCP 0.9s · CLS ≤ 0.001 · TBT 480–700ms.

How the load stays light: three.js and the shaders load on the visitor's first interaction (mouse move,
touch, scroll), not during page load; shaders compile without blocking; the take-off frames start
downloading with the first scroll, are kept as compressed Blobs and only a small window around the current
frame is decoded (off the main thread).

Known gap: with CPU 4× throttling the pinned journey does not hold a full frame rate (desktop `high`
≈ 20–25fps, phone `lite` ≈ 40fps with some longer frames). The cost is uploading each footage frame to the
GPU. The stage already halves footage updates when a frame runs long and downgrades tiers when it stays slow.

## 12 · Part 2 as built (2026-11-13)

**The film in one line:** sky (hero) → take-off (journey) → cloud (white) → four destinations at dusk →
above the clouds at last light (why) → night, the route across the Earth (how) → final approach (CTA) →
the terminal (Visa) → touchdown (footer). After the one bright moment in the cloud, the page only gets darker.

What changed from the plan:

- **Lottie → own SVG + GSAP.** The four inbox Lotties were rendered and reviewed: flat cartoon style, and the visa
  stamp reads "VENICE · ITALY". None is shipped. Every icon and the stamp is inline SVG drawn by GSAP, coloured by
  tokens (decision D is closed this way: the scales icon is ours).
- **Media (decisions C, E):** passport photo → silhouettes in a terminal at sunset; events photos → an empty
  auditorium; legal photo regraded from a teal studio to navy; a new dusk photo for "why", a runway at dusk for the
  CTA, a terminal at sunset for the Visa gate. Sources and edits: `docs/media-credits.md`.
- **CTA lights are CSS, not WebGL.** The runway is real footage; eleven sequenced lights in CSS perspective cost
  nothing and work on every tier.
- **The stage serves three acts** (flight · wipe · globe) with one renderer; the canvas moves to the most
  visible host and each section's DOM version returns when it leaves.
- **Fixed from Part 1:** on the css tier the hero's cloud photos loaded during page load and became the largest
  paint (LCP 6.3s in Lighthouse without a GPU). They now load on the first interaction.

Measured on the production build (local preview, Intel HD P630 integrated GPU, Chromium):

| Metric                                    | Desktop 1440×900 (high)        | Phone 390×844 (lite)        |
| ----------------------------------------- | ------------------------------ | --------------------------- |
| Loaded by itself (no interaction)         | 704 KB                         | 471 KB                      |
| After the first interaction (WebGL chunk) | 844 KB                         | 610 KB                      |
| After scrolling the whole page            | 5.4 MB (4.2 MB = journey frames) | 2.3 MB (1.3 MB = frames)  |
| Scroll frames with CPU 4×, §1.3–1.7       | median 16.7ms · 0–1 frames over 33ms per section | median 16.7ms · none over 33ms |
| Scroll frames with CPU 4×, hero + journey | median 16.7ms · p95 33ms       | median 16.7ms · none over 33ms |

Lighthouse mobile (headless, no GPU = css tier): Arabic 95 · English 98 · Accessibility 100 · Best practices 100 ·
SEO 100 · LCP 1.1s · CLS 0 · TBT 50–180ms.

Not verified here: Safari (macOS / iOS), Firefox and a real mid-range Android — this machine only has Chromium.
