# WaysZ Home — Creative Treatment ("The Journey")

Status: **proposal — waiting for approval.** Covers the whole Home page (brief §1.1–1.8).
Part 1 builds §1.1, §1.2, §1.2b and the shared foundation. Part 2 builds §1.3–1.8.

## 1 · The idea in one paragraph

The Home page is one continuous flight filmed at golden hour. The logo intro takes off; the curtain
lifts and we are already in the air, looking out over the wing at a warm horizon. We scroll: the
camera pushes into the clouds, comes out over a runway at dusk, and we watch a real take-off while
three short lines say how WaysZ works with you. We climb through the cloud layer, cruise past four
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
| 1.2b | The Journey           | Out of the white: a runway at dusk. Scroll plays the take-off frame by frame. Three captions from the brief's intro paragraph appear one at a time (listen → guide → accompany). Light streaks grow with speed. At the end we climb into the cloud deck: cloud layers fly past the camera and the screen clears into the light page below. Link: "تعرّف علينا أكثر". | image sequence (WebP frames) drawn as a texture in the same WebGL stage · cloud fly-through built from the 03 photos (luminance-keyed layers) · Lottie plane on the progress HUD | **1** |
| 1.3  | Four destinations     | Cruising. Four full-bleed sticky cards, one per area; each new photo arrives through a soft cloud-wipe (shader displacement) instead of a hard cut. Area name huge, 2 lines of copy, one link, a small Lottie that plays once. The area hue is only a thin line and the icon.                                                                               | 04–07 photos (graded to the navy/amber look) · `destinations` (sticky CSS) · Lottie: scales, passport, (events, code — to source)                                        | no  |
| 1.4  | Why WaysZ             | The view expands: a rounded "window" photo grows to full screen, then the six reasons settle in two calm rows. No icons-in-circles grid; hierarchy by type size.                                                                                                                                                                                              | `media-reveal` · one wide photo (to source: cabin window / meeting room at dusk)                                                                                          | **2** |
| 1.5  | How we work           | Night side of the Earth, slowly turning. A warm route arc draws across it through four stops while the four steps light up one by one; the plane rides the arc.                                                                                                                                                                                              | three.js globe with NASA Black Marble (public domain) + arc shader · `route-steps` for text · fallback: static night-Earth image + SVG route                              | **3** |
| 1.6  | CTA — "Final approach" | Descent: runway approach lights converge toward the two buttons. Headline by lines; magnetic buttons; WhatsApp button only if `site.whatsapp` exists.                                                                                                                                                                                                         | short dusk video or photo (to source) · light points in the WebGL stage · `data-magnetic`                                                                                 | no  |
| 1.7  | WaysZ Visa            | A boarding pass slides in; the visa stamp lands on it (Lottie, once). One button to `site.visaSite`.                                                                                                                                                                                                                                                         | `boarding-gate` · Lottie "visa stamp passport" · 05 airport photo behind a dark overlay                                                                                   | no  |
| 1.8  | Footer — "Landed"     | Logo wings assemble, the plane lands in its place. Legal notice is static — never animated.                                                                                                                                                                                                                                                                  | existing `footer-landing`                                                                                                                                                 | —   |

Three pins total (Journey, Why, How). Hero and destinations use CSS `position: sticky`, not pins.

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

`src/motion/stage/` — `stage.ts` (renderer, tiering, ticker, visibility, dispose), `acts/*.ts`
(one module per scene), `shaders/*.glsl.ts`.

- Created lazily: after `waysz:intro-done` **and** the hero text is visible, inside `requestIdleCallback`;
  `three` is a dynamic import, so it is never in the initial bundle.
- Driven by `gsap.ticker` (no second RAF). Rendering stops when the active act is off-screen
  (IntersectionObserver) or `document.hidden`. DPR cap 1.5 desktop / 1 mobile. Resize is debounced.
- Disposal on `pagehide`: geometries, materials, textures, render targets, `renderer.dispose()`,
  `forceContextLoss()`; ticker callbacks removed.
- `webglcontextlost` → drop to tier "none" (poster stays; nothing breaks).

| Tier     | When                                                                            | Hero                                                        | Journey                                     |
| -------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| **high** | desktop, WebGL2, non-software GPU, ≥ 4 cores                                    | video texture + 3 shader cloud layers + god rays + grain     | frames as texture + streaks + cloud fly-through |
| **low**  | mobile / touch / weak GPU / frame time > 24ms for 2s (auto-downgrade)           | plain `<video>` (mobile variant) + 2 CSS cloud layers + CSS grain | 2D-canvas sequence (every 2nd frame) + CSS cloud layers |
| **none** | reduced motion, no WebGL, `saveData`, JS off                                    | poster image, text in final state                           | first frame, all captions visible, no pin   |

The HTML always contains the poster / first frame and the full text, so LCP, no-JS and reduced
motion never depend on WebGL.

## 5 · Media audit of `media-inbox/` (checked frame by frame)

| File                         | Finding                                                                                                                                              | Plan                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 01 hero clouds (7.8s, 24fps) | Clean. Winglet is plain navy/white, no logo or text. Cool blue grade.                                                                                 | Slow to ~15s (motion-interpolated), cross-fade loop, warm grade toward amber. Desktop + mobile + poster.          |
| 02 takeoff (8.1s, 60fps)     | **Problem ×3:** readable "vistara" on the fuselage + tail logo; flat grey haze (not golden hour); the plane is only ~18% of the frame width.           | See decision A below. A dusk-silhouette grade removes the livery (tested), but the shot stays weak.                |
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
- `three` (own chunk, ~170 KB gzip with only the classes we import) + shaders load on idle after LCP.
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

## 10 · Decisions needed

- **A — Take-off footage.** 02 shows a Vistara livery, is grey and hazy, and the plane is small.
  *Recommended:* I find and vet a golden-hour take-off clip on Pexels/Mixkit and use it; 02 is dropped.
  *Alternative:* keep 02 as a dusk silhouette (livery gone, but a flatter, less impressive shot).
- **B — 3D aircraft.** I will add one only if I find an unbranded CC0/CC-BY model that looks premium
  as a back-lit silhouette. Sketchfab downloads need a login, so I may ask you to download one file.
  Without it the page is still complete (footage + shader sky).
- **C — Passport photo** reads as a US passport. Keep (cropped/dimmed so the seal is not legible) or replace?
- **D — `Justice_Scales_Animation_v1.json`** has no source URL. Send the link or I replace it in Part 2.
- **E — Events photos** both show brands/faces → I source replacements in Part 2.
