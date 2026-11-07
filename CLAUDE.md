# WaysZ — Project Rules for Claude Code

## What we are building
The marketing website of **WaysZ** at **waysz.org** — a multi-service firm with four areas:
Legal Services · Immigration, Study & Visa · International Exhibitions & Conferences · Software & Technology.

Pages: Home, Services, Service Details (ONE template → many pages), About, Contact. Arabic AND English.

The sister site **WaysZ Visa** (waysz-visa.com) comes LATER as a separate repo. Do not build anything
for it here except links to `site.visaSite`. Keep `src/motion`, `src/styles` and the waysz-motion skill
generic so they can be copied there.

Source of truth for structure and copy: `docs/brief/WaysZ-Website-Brief-v2.pdf`.
Sections are numbered (e.g. "1.4 Why WaysZ"); use the same numbers in comments, TODOs and commits.
The brief is Arabic; write the English version as a faithful, natural translation (flag doubtful
terms in the PR description). Never invent services, numbers, claims, clients or testimonials.
Items marked «مقترح» are pending approval: build them with `proposed: true` in the data.

Client priority #1: **premium, cinematic animation**. Priority #2: **trust and clarity** (legal audience).
Animation must never hurt readability, accessibility, SEO or speed.

## Stack (do not change without asking)
- **Astro 7**, static output, `.astro` components only (no React/Vue/Svelte/Tailwind).
- **Vanilla TypeScript**. **GSAP 3** (ScrollTrigger, SplitText, DrawSVG, MotionPath, Flip) + **Lenis**.
- **Plain CSS** with tokens from `src/styles/tokens.css`.
- Font: **Almarai** (Arabic + Latin), self-hosted via `@fontsource/almarai`. Weights: 400 / 700 / 800 only —
  use the `--weight-*` tokens, never 500 or 600.
- **Node ≥ 22.23.4**. Ask before adding ANY dependency.

## Commands
```bash
npm install        # once after cloning
npm run dev        # http://localhost:4321  ·  Motion Lab: /dev/motion-lab/  ·  English: /en/dev/motion-lab/
npm run check      # TypeScript + Astro diagnostics — must be 0 errors before every PR
npm run build      # → dist/  (what we upload to the hosting)
npm run preview    # serve dist/ locally to test the production build
```

## Structure
```
waysz/
├─ CLAUDE.md · README.md · astro.config.mjs · package.json
├─ .claude/skills/waysz-motion/   SKILL.md (rules + API) · reference.md (scene catalog + page map)
├─ docs/brief/                    the approved brief (PDF)
├─ public/                        .htaccess · favicon.svg · robots.txt (copied as-is to dist/)
└─ src/
   ├─ assets/logo/waysz-mark.svg  TEMP logo (parts are classes — see "Logo")
   ├─ components/                 Header · Footer · Logo · Preloader · FlightRail · WhatsAppFloat · TodoSection
   ├─ content/services/*.json     one file per service (AR + EN)
   ├─ content.config.ts           schema of a service
   ├─ i18n/                       ar.json · en.json (same keys) · index.ts helpers
   ├─ layouts/BaseLayout.astro    <html lang dir>, SEO tags, boot script, header/footer, motion init
   ├─ lib/                        forms.ts (validation + send) · site.ts (contacts, URLs — client data)
   ├─ motion/                     index.ts · config.ts · smooth-scroll.ts · globals/ · scenes/
   ├─ pages/                      THIN wrappers only (AR at /, EN under /en/)
   ├─ styles/                     tokens.css · base.css
   └─ views/                      the real page content (HomePage, ServicesPage, …, MotionLab)
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
- `src/content/services/<slug>.json` — the file name is the slug. Shape is defined in `src/content.config.ts`:
  `area, order, proposed, ar{…}, en{…}` with `name, summary, description, audience[], offer[], steps[],
  excludes[], faq[], cta{}` (= Service Details Template, brief §3).
- `src/pages/services/[slug].astro` and `src/pages/en/services/[slug].astro` generate every service page
  through `src/views/ServiceDetailPage.astro`. NEVER hand-write a page per service.
- Adding a service = adding one JSON file. Removing = deleting it.

## RTL rules (critical)
- Logical CSS only: `margin-inline-start`, `padding-inline-end`, `inset-inline-start`, `text-align: start`,
  `border-inline-*`. Never `left/right` for layout.
- Directional icons get `class="icon-dir"` (flips in RTL). **Logos never flip.**
- JS: horizontal motion × `env.dir` (see waysz-motion).
- **Never split Arabic text into characters** (breaks letter joining). Words or lines only.
- Emails, phones, Latin names inside Arabic text: `<bdi>`. Phone/email inputs: `dir="ltr"`.

## Design rules
- Components use **semantic tokens only** (`var(--color-brand)`, `var(--color-accent)`, …). Never raw hex,
  never primitives (`--midnight-800`). The palette is TEMPORARY; the real one replaces LAYER 1 only.
- Dark sections: `class="theme-dark"`. One font family (Almarai); hierarchy via size and weight.
- Spend boldness in the signature moments (hero, dive, destinations). Keep the rest quiet and disciplined.
- Avoid template tells: accenting one word of a headline in another color, ALL-CAPS eyebrow labels above
  headings, numbered markers on content that is not a sequence, "→" appended to every link, identical
  rounded cards with the same shadow everywhere.
- Mobile-first. Breakpoints 640 / 1024 / 1440. Always test at 360px.
- Component CSS in the component `<style>` (scoped). Global CSS only in `src/styles`.

## Logo
- `src/assets/logo/waysz-mark.svg` is TEMPORARY (traced). Parts are classes: `.mark-wing-left`,
  `.mark-wing-right`, `.mark-plane`, and the invisible motion guide `.mark-road`.
- Always render it with `<Logo />` (`decorative` when text is next to it). Colors: `--logo-mark`, `--logo-plane`.
- When the final logo arrives: keep the same class names and re-measure `LOGO` in `src/motion/config.ts`.

## Animation — read before ANY motion work
- Use the project skill **waysz-motion** (`.claude/skills/waysz-motion/`) and the installed **gsap-skills**.
- Working examples of every scene and attribute: `src/views/MotionLab.astro` → `/dev/motion-lab/` (dev only).
- Never add another animation library (AOS, anime.js, three.js, Barba, Lottie…) without asking.
- No `<ClientRouter />`: page transitions are native CSS view transitions (already in base.css).

## Forms (no backend)
- Contract in `src/lib/forms.ts`: `<form data-form="name" data-messages={JSON.stringify(t.form)}>`,
  each field `id` + `<p id="{id}-error" class="field__error" aria-live="polite">`, a `[data-form-status]`.
- Messages come from the brief §05 microcopy (`t.form`). Show `t.form.consent` under every form.
- Destination NOT decided (an email such as info@waysz.org). Until `PUBLIC_FORM_ENDPOINT` exists, sending
  is simulated. `TODO(endpoint)` — do not choose a provider without the team.

## Client data
- Phone, WhatsApp, address, hours, emails live ONLY in `src/lib/site.ts`. Empty = not rendered.
  Never invent them; leave `TODO(client)`.

## Deploy (Namecheap — Stellar Plus, cPanel)
- `npm run build` → upload the CONTENTS of `dist/` into `public_html/` (cPanel File Manager or FTP).
- `public/.htaccess` (HTTPS, 404 page, caching, compression) is included in every build automatically.
- Turn on the free SSL in cPanel before going live.

## Definition of Done (every page / section)
- `npm run check` → 0 errors. No console errors.
- Works in Arabic AND English, desktop AND 360px mobile, with reduced motion ON, and with JS OFF.
- Semantic HTML: one `<h1>`, landmarks, alt text, visible focus, 44px tap targets.
- Lighthouse mobile: Performance ≥ 85 · Accessibility ≥ 95 · SEO ≥ 95.

## Astro 7 gotchas
- Whitespace is stripped JSX-style: write `{" "}` where a space between inline elements matters.
- `<script>` in `.astro` is bundled and runs once per page load. `is:inline` only for the boot script.
- Typing DOM lookups in TS: `root.querySelector<SVGPathElement>('.x')!` (gsap's selector returns HTMLElement[]).

## Team workflow
- One branch per task: `feat/home-hero`, `feat/services-page`, … Small PRs, one review, then merge.
- Shared files (`src/styles`, `src/motion`, `src/components`, `src/i18n`, layouts, `CLAUDE.md`) have one
  owner at a time — announce in the group before editing.
- Before building a section: read its brief section, its row in waysz-motion `reference.md`, and the
  matching example in the Motion Lab. Replace the section's `<TodoSection>`.
