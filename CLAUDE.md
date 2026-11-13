# WaysZ — Project Rules for Claude Code

## What we are building

The marketing website of **WaysZ** at **waysz.org** — a multi-service firm with four areas:
Legal Services · Immigration, Study & Visa · International Exhibitions & Conferences · Software & Technology.

Pages: Home, Services, Service Details (ONE template → many pages), About, Contact. Arabic AND English.

The sister site **WaysZ Visa** (waysz-visa.com) comes LATER as a separate repo. Do not build anything
for it here except links to `site.visaSite`.

Source of truth for structure and copy: `docs/brief/WaysZ-Website-Brief-v2.pdf`.
Sections are numbered (e.g. "1.4 Why WaysZ"); use the same numbers in comments, TODOs and commits.
The brief is Arabic; write the English version as a faithful, natural translation (flag doubtful
terms in the PR description). Never invent services, numbers, claims, clients or testimonials.
Items marked «مقترح» are pending approval: build them with `proposed: true` in the data.

## Visual direction (most important)

**Cinematic, Apple-product-page level.** The pages are built from REAL footage and photos plus
scroll-driven motion and a real-time WebGL layer.
**The goal on every page is a jaw-dropping, Awwwards-level experience.**

**Creative freedom:** you are free to source your own photos, videos, 3D models, textures and animations, and
to create your own animations, shaders and 3D, whenever it makes the site more impressive — no need to ask
first. Only rule: external files come from a source with a clear free license (the approved list in "Media")
and get a row in `docs/media-credits.md`.
The Home page concept ("The Journey", one continuous flight) is in `docs/home-creative-treatment.md`.

- full-screen background video, scroll-scrubbed image sequences (video → frames on a canvas),
  media that expands to full screen, sticky full-bleed media cards, huge staged typography,
- small moments (icons, stamps, route planes): our own inline SVG animated with GSAP, or a Lottie (sourced or
  our own) when it matches the premium, cinematic look (recolored to our tokens if needed),
- background layers that move with the mouse (depth), and a plane-shaped cursor on desktop,
- a 3D layer (three.js + custom GLSL) that puts the footage inside one WebGL stage: shader clouds the camera
  flies through, sun glow / god rays, grain, vignette. It is an enhancement: every scene also works without it.
- The logo "Take-off" intro (preloader) stays as it is.
  Reuse what exists when it is good enough; source or create something new when that is more impressive.
  Trust and clarity still matter (legal audience): motion never hides content or slows reading.

## Stack (do not change without asking)

- **Astro 7**, static output, `.astro` components only (no React/Vue/Svelte/Tailwind).
- **Vanilla TypeScript**. **GSAP 3** + **Lenis**. All GSAP plugins are allowed (ScrollTrigger, SplitText, Flip,
  MotionPath, DrawSVG, MorphSVG, Observer, InertiaPlugin, CustomEase, ScrambleText). ScrambleText on Latin
  text only — never on Arabic. Register only the plugins a page really uses.
- **three.js** for 3D, with its addons from `three/examples/jsm` (GLTFLoader, DRACOLoader, EffectComposer,
  passes) and custom GLSL where it looks better than stock materials. Always through the shared stage in
  `src/motion/stage/` (one renderer per page, lazy-loaded, capability tiers) — never a second renderer.
- **lottie-web** for Lottie animations (lazy-loaded only on pages that use it).
- **Plain CSS** with tokens from `src/styles/tokens.css`.
- Font: **Almarai** (Arabic + Latin), self-hosted via `@fontsource/almarai`. Weights 400 / 700 / 800 only —
  use the `--weight-*` tokens, never 500 or 600.
- **Node ≥ 22.23.4**. Approved dependencies: astro, gsap, lenis, three, lottie-web, @fontsource/almarai,
  @astrojs/sitemap. Dev only: playwright (visual QA scripts in `scripts/`), @types/three (types for three).
  Ask before adding ANY other dependency, with a one-line reason (no AOS, anime.js, Barba, Swiper…).

## Commands

```bash
npm install        # once after cloning
npm run dev        # http://localhost:4321  ·  Motion Lab: /dev/motion-lab/  ·  English: /en/dev/motion-lab/
npm run check      # TypeScript + Astro diagnostics — must be 0 errors before every PR
npm run build      # → dist/  (what we upload to the hosting)
npm run preview    # serve dist/ locally to test the production build

# Visual QA (Playwright, uses your installed Chrome). Dev only: force a tier with ?tier=high|lite|css
node scripts/qa-shots.mjs <outDir>     # screenshots while scrolling: AR/EN · desktop/phone/360 · every tier · reduced motion · no JS
node scripts/qa-weight.mjs             # page weight of the production preview (run `npm run preview -- --port 4322` first)
node scripts/qa-fps.mjs <url> 4        # scroll frame times with CPU throttling 4x (whole page)
# No Google Chrome on the machine (e.g. Linux)? Point the scripts at any Chromium:
#   QA_CHROME=~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome node scripts/qa-shots.mjs out/
```

## Structure

```
waysz/
├─ CLAUDE.md · README.md · astro.config.mjs · package.json
├─ .claude/skills/waysz-motion/   SKILL.md (motion rules + API) · reference.md (scenes + page storyboard)
├─ .claude/skills/waysz-media/    SKILL.md (sources, licenses, ffmpeg recipes, budgets, credits)
├─ docs/brief/                    the approved brief (PDF)
├─ docs/home-creative-treatment.md  Home concept + storyboard v2 (§1.1–1.8)
├─ scripts/                       Playwright QA: qa-shots · qa-immigration · qa-weight · qa-fps (+ qa-browser: shared launch)
│                                 data/media builds: build-borders (globe borders) · render-globe-still
├─ docs/media-credits.md          one row per media file we ship (source, author, license)
├─ media-inbox/                   RAW downloads before optimizing — gitignored, never shipped
├─ public/
│  ├─ media/video/                optimized background videos (mp4 + webm + poster)
│  ├─ media/seq/<name>/           image sequences (frame_0001.webp …)
│  ├─ media/lottie/               Lottie JSON files
│  ├─ media/img/                  images loaded by JS only (e.g. cloud layers of the css tier)
│  ├─ media/geo/                  country borders of the globe (TopoJSON, built by scripts/build-borders.mjs)
│  └─ .htaccess · favicon.svg · robots.txt
└─ src/
   ├─ assets/media/               photos (optimized by Astro <Image>)
   ├─ assets/logo/waysz-mark.svg  TEMP logo (parts are classes — see "Logo")
   ├─ components/                 Header · Footer · Logo · Preloader · FlightRail · WhatsAppFloat · TodoSection
   │                              + BgVideo · ImageSequence · Lottie · CursorPlane (media toolkit)
   ├─ content/services/*.json     one file per service (AR + EN)
   ├─ content.config.ts           schema of a service
   ├─ data/countries.json         selectable countries of the globe (built with the borders)
   ├─ i18n/                       ar.json · en.json (same keys) · index.ts helpers
   ├─ layouts/BaseLayout.astro    <html lang dir>, SEO, boot script, header/footer, cursor, motion init
   ├─ lib/                        forms.ts · site.ts (client data) · borders.ts (decodes the borders, country at a point)
   ├─ motion/                     index.ts · config.ts · smooth-scroll.ts · globals/ · scenes/
   │  └─ stage/                   3D layer: stage.ts (renderer) · tier.ts · bridge.ts · acts/ (flight · wipe · globe · explore) · shaders/
   ├─ pages/                      THIN wrappers only (AR at /, EN under /en/)
   ├─ styles/                     tokens.css · base.css
   └─ views/                      real page content (HomePage, ServicesPage, …, MotionLab)
      ├─ home/                    one file per Home section: Areas · Why · How · Cta · Visa (markup + copy + styles)
      └─ immigration/             sections of the Immigration group page: Hero · Journey · Services · Explore
```

## Pages & languages

- Arabic is the default (RTL) at `/`, English (LTR) at `/en/`. Configured in `astro.config.mjs`.
- A page is written ONCE in `src/views/XPage.astro` with a `lang` prop. Two thin wrappers render it:
  `src/pages/about.astro` → `<AboutPage lang="ar" />` and `src/pages/en/about.astro` → `<AboutPage lang="en" />`.
- **No hard-coded UI text in components.** UI strings: `src/i18n/ar.json` + `en.json` (identical keys).
  Use `const t = useTranslations(lang)`. Page-specific long copy may live in the view as `{ ar, en }`.
- Links: `localizePath('/services/', lang)`. Language switch: `switchLangPath(Astro.url.pathname, to)`.
- URLs end with `/` (`trailingSlash: 'always'`). Slugs are English for both languages.

## Content model — one template, many pages

- `src/content/services/<slug>.json` — the file name is the slug. Shape in `src/content.config.ts`.
- `src/pages/services/[slug].astro` and `src/pages/en/services/[slug].astro` generate every service page
  through `src/views/ServiceDetailPage.astro`. NEVER hand-write a page per service.
- A service GROUP may have its own page (brief §2.x): `/services/immigration-study-visa/` is a static route
  (`src/views/ImmigrationPage.astro`) and wins over `[slug]`; never name a service file like a group page.
  Its cards link to `/services/<slug>/` only when that service file exists.

## Media (real footage, photos, Lottie)

- Read the **waysz-media** skill before adding ANY image, video, sequence or Lottie file.
- Source freely (photos, videos, 3D models, textures, animations) — from clearly free-licensed sources only: Pexels, Unsplash, Pixabay, Mixkit (Free License clips only), LottieFiles
  (free animations), Poly Haven (CC0 HDRIs/textures/models), Kenney (CC0), NASA imagery (public domain),
  Sketchfab models only if CC0 or CC-BY (credit CC-BY). Download into `media-inbox/` first, then optimize.
  Every shipped file gets a row in `docs/media-credits.md`. No file without a known source.
- Never ship raw downloads: optimize first (recipes in waysz-media). Raw files stay in `media-inbox/`.
- No airline liveries/logos, no visible brands, no identifiable faces in hero roles or implying endorsement,
  no recognizable national passport / flag / country name, nothing showing people in a bad light.
- Every video has a poster image; every image has width/height and meaningful `alt` (empty `alt=""` if decorative).

## RTL rules (critical)

- Logical CSS only: `margin-inline-start`, `padding-inline-end`, `inset-inline-start`, `text-align: start`,
  `border-inline-*`. Never `left/right` for layout.
- Directional icons get `class="icon-dir"` (flips in RTL). **Logos never flip.** Photos/videos never flip
  (text or signs inside them would mirror).
- JS: horizontal motion × `env.dir` (see waysz-motion).
- **Never split Arabic text into characters** (breaks letter joining). Words or lines only.
- Emails, phones, Latin names inside Arabic text: `<bdi>`. Phone/email inputs: `dir="ltr"`.

## Design rules

- Components use **semantic tokens only** (`var(--color-brand)`, `var(--color-accent)`, …). Never raw hex,
  never primitives (`--midnight-800`). The palette is TEMPORARY; the real one replaces LAYER 1 only.
- Text over video/photos always sits on a dark gradient overlay so it passes contrast (AA).
- Dark sections: `class="theme-dark"`; a light island inside one (e.g. the boarding pass): `class="theme-light"`.
  One font family (Almarai); hierarchy via size and weight.
- Avoid template tells: accenting one word of a headline in another color, ALL-CAPS eyebrow labels,
  numbered markers on content that is not a sequence, "→" appended to every link, identical cards everywhere.
- Mobile-first. Breakpoints 640 / 1024 / 1440. Always test at 360px.
- Component CSS in the component `<style>` (scoped). Global CSS only in `src/styles`.

## Logo

- `src/assets/logo/waysz-mark.svg` is TEMPORARY (traced). Parts are classes: `.mark-wing-left`,
  `.mark-wing-right`, `.mark-plane`, and the invisible motion guide `.mark-road`.
- Always render it with `<Logo />`. Colors: `--logo-mark`, `--logo-plane`.
- When the final logo arrives: keep the same class names and re-measure `LOGO` in `src/motion/config.ts`.

## Animation — read before ANY motion work

- Use the project skill **waysz-motion** (+ **waysz-media** for media) and the installed **gsap-skills**.
- Working examples of the basic scenes and attributes live in the Motion Lab (`src/views/MotionLab.astro`).
  The Home page is built directly in `src/views/HomePage.astro` (the Motion Lab is not required for it);
  for other pages, add a new technique to the Motion Lab first. New scenes, shaders and 3D acts of your own
  are welcome whenever they make the page more impressive (see "Creative freedom").
- Home may use up to **3 pinned scenes** (other pages: 2), as long as scrolling stays smooth. As built, Home has
  ONE real pin (the Journey); the areas, "why" and "how" screens are held with CSS `position: sticky` + a scrubbed
  ScrollTrigger — prefer that whenever a scene only needs to hold the screen.
- Content that a scroll state hides (stacked cards, waiting steps) is faded with `opacity`, never
  `visibility`/`autoAlpha`, so screen readers and keyboard focus still reach it; dimmed text stays ≥ AA contrast.
- 3D is tiered by DEVICE CAPABILITY, not by "mobile": `high` (desktop GPU) · `lite` (capable phones/tablets:
  same scene, cheaper shader, lower DPR) · `css` (weak device, no WebGL2, saveData, reduced motion: plain
  video + CSS layers / posters). The HTML underneath is always complete (LCP, no-JS, reduced motion).
- No `<ClientRouter />`: page transitions are native CSS view transitions (already in base.css).

## Forms (no backend)

- Contract in `src/lib/forms.ts`. Messages from the brief §05 (`t.form`). Show `t.form.consent` under every form.
- Destination NOT decided. `TODO(endpoint)` — do not choose a provider without the team.

## Client data

- Phone, WhatsApp, address, hours, emails live ONLY in `src/lib/site.ts`. Never invent them.

## Deploy (Namecheap — Stellar Plus, cPanel)

- `npm run build` → upload the CONTENTS of `dist/` into `public_html/`. `.htaccess` is included.

## Definition of Done (every page / section)

- `npm run check` → 0 errors. No console errors.
- Works in Arabic AND English, desktop AND 360px mobile, with reduced motion ON, and with JS OFF.
- Media: initial page weight ≤ 4 MB on desktop / ≤ 2 MB on mobile; nothing below the fold loads early.
- Lighthouse mobile: Performance ≥ 75 · Accessibility ≥ 95 · SEO ≥ 95. LCP ≤ 2.5s (hard rule).
- Smooth: no dropped frames while scrolling with DevTools CPU throttling 4× on the scrubbed sections.

## Astro 7 gotchas

- Whitespace is stripped JSX-style: write `{" "}` where a space between inline elements matters.
- `<script>` in `.astro` is bundled and runs once per page load. `is:inline` only for the boot script.
- Typing DOM lookups in TS: `root.querySelector<SVGPathElement>('.x')!`.

## Team workflow

- One branch per task: `feat/home-hero`, `feat/services-page`, … Small PRs, one review, then merge.
- Shared files (`src/styles`, `src/motion`, `src/components`, `src/i18n`, layouts, `CLAUDE.md`, skills)
  have one owner at a time — announce in the group before editing.
- Before building a section: read its brief section, its storyboard row in waysz-motion `reference.md`,
  and the matching Motion Lab example. Replace the section's `<TodoSection>`.
