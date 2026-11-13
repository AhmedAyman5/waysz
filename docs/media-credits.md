# Media credits

One row per media file we ship. Raw downloads stay in `media-inbox/` (not in git).
Rules and recipes: `.claude/skills/waysz-media/SKILL.md`.

Authors marked "see source page" could not be read automatically (the source site blocks scripted
requests) — open the link once and replace the note with the contributor's name.

## Shipped

| File                                                        | Source URL                                                                           | Author                | License                | Downloaded | What we changed                                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------- | ---------------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| public/media/video/hero-clouds.mp4 · .webm · -poster.webp   | https://www.pexels.com/video/blue-sky-over-clouds-13371669/                          | see source page       | Pexels License         | 2026-11-12 | slowed to half speed (motion-interpolated, 7.8s → 14.1s), seamless loop, warm grade, 1600×900        |
| public/media/video/hero-clouds-m.mp4 · .webm · -poster.webp | same                                                                                 | same                  | Pexels License         | 2026-11-12 | same, 960×540                                                                                       |
| public/media/seq/takeoff/frame_0001…0140.webp               | https://www.pexels.com/video/footage-of-the-plane-taking-off-3723453/                | see source page       | Pexels License         | 2026-11-12 | first 27s, stabilized, cropped in (window frame removed), overcast → dusk grade, 140 frames 1280×720 |
| public/media/seq/takeoff-m/frame_0001…0070.webp             | same                                                                                 | same                  | Pexels License         | 2026-11-12 | same, 70 frames, portrait crop 720×900 for small screens                                            |
| public/media/img/cloud-1.webp                               | https://www.pexels.com/photo/white-clouds-on-blue-sky-19670/                         | Miguel Á. Padriñán    | Pexels License         | 2026-11-12 | sky keyed to transparency, feathered edges, 1100px (css tier only)                                  |
| public/media/img/cloud-2.webp                               | https://www.pexels.com/photo/clouds-in-the-sky-15370910/                             | Sergey Korolev        | Pexels License         | 2026-11-12 | same                                                                                                |
| public/media/lottie/plane.json                              | https://lottiefiles.com/free-animation/airplane-flying-RzvHIAffjc                    | see source page       | Lottie Simple License  | 2026-11-12 | none (Motion Lab example only — not used on a public page yet)                                      |
| src/assets/media/legal-justice.jpg                          | https://unsplash.com/photos/SUp2xgMvyXQ                                              | Sasun Bughdaryan      | Unsplash License       | 2026-11-13 | 2400px download, cropped to 2140×1206, teal studio background graded to navy, vignette (§1.3)       |
| src/assets/media/travel-terminal.jpg                        | https://unsplash.com/photos/KZSNMN4VxR8                                              | Artur Tumasjan        | Unsplash License       | 2026-11-13 | **replaces the passport photo (decision C)**: silhouettes in a terminal at sunset; 2400×1400 crop, slight grade (§1.3) |
| src/assets/media/events-hall.jpg                            | https://unsplash.com/photos/kFCor16bqq4                                              | ARTO SURAJ            | Unsplash License       | 2026-11-13 | **replaces the events photos (decision E)**: empty auditorium, no brands, flags or faces; 2400×1400 crop, vignette (§1.3) |
| src/assets/media/software-code.jpg                          | https://unsplash.com/photos/5sLNGV2EFRM                                              | Harshit Katiyar       | Unsplash License       | 2026-11-13 | 2400px download, 2400×1400 crop, slight grade (§1.3)                                                |
| src/assets/media/why-dusk.jpg                               | https://unsplash.com/photos/IPVJd-fVDg4                                              | Giuseppe Di Bella     | Unsplash License       | 2026-11-13 | cropped (dark window frame on the right removed), lifted, 2200×1340 (§1.4)                          |
| src/assets/media/cta-approach.jpg                           | https://unsplash.com/photos/a0l62-FIWZg                                              | Eric Wang             | Unsplash License       | 2026-11-13 | cropped (window frame on the right removed), 2060×1300 (§1.6)                                       |
| src/assets/media/visa-gate.jpg                              | https://unsplash.com/photos/ltCNpYiJPRg                                              | Alex Alvarez          | Unsplash License       | 2026-11-13 | **left 21% cropped off (a readable shop sign)**, darker, 1900×1500 (§1.7)                           |
| public/media/img/earth-night.webp · earth-night-m.webp      | https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/ — Black Marble 2016, 0.1° map | NASA Earth Observatory | Public domain          | 2026-11-13 | resized to 2048×1024 and 1024×512, WebP: globe texture of §1.5. No NASA logo, no endorsement implied |
| public/media/img/earth-poster.webp                          | our own render of the map above (the WebGL globe, dev URL `?globe=poster`)           | WaysZ                 | —                      | 2026-11-13 | still image for the css tier, no JS and reduced motion (§1.5)                                       |

Astro generates the responsive WebP files of `src/assets/media/*` at build time (`dist/_astro/`).

Icons and small moments of §1.3–1.7 (area icons, the six "why" icons, the visa stamp, the route plane) are our
own inline SVG animated with GSAP. No Lottie file is shipped for them: see the Lottie quality rule in `waysz-media`.

## Checked and NOT shipped

| File in media-inbox                                  | Source URL                                                                                          | Decision                                                                                                           |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 02-takeoff/12254086_1920_1080_60fps.mp4              | https://www.pexels.com/video/indira-gandhi-international-airport-airplane-take-off-27890134/        | **Dropped**: readable airline name on the fuselage + tail logo, grey haze, small plane. Replaced by Pexels 3723453. |
| 03-clouds/pexels-brett-sayles-4095255.jpg            | https://www.pexels.com/photo/black-woods-on-mountain-in-mist-4095255/                               | Clean, not needed in Part 1.                                                                                       |
| 04-legal-justice/…YFz39MOmxnQ                        | https://unsplash.com/photos/YFz39MOmxnQ                                                             | Clean, re-downloaded at 2400px, not used: white studio background does not grade to the night look.                |
| 05-travel-passport/photo-1530469525856…              | https://unsplash.com/photos/jXxdtXFEjcc                                                             | **Replaced** (decision C): recognizable national passport cover. → travel-terminal.jpg                             |
| 05-travel-passport/…s7o9S4RtYHc                      | https://unsplash.com/photos/s7o9S4RtYHc                                                             | Re-downloaded at 2400px, **not used**: daylight, wayfinding signs and adverts. → visa-gate.jpg instead (§1.7).     |
| 06-events-hall (2 photos)                            | unsplash.com … KVvEpFVq_-U · dJICd7b_LlE                                                            | **Replaced** (decision E): readable brands, country names, speaker portraits. → events-hall.jpg                    |
| 06-events-hall-v2/…5nGCyV51P60 · …kTT8mJ5pPpc        | https://unsplash.com/photos/5nGCyV51P60 (Hayk Badalyan) · https://unsplash.com/photos/kTT8mJ5pPpc    | Clean alternates for the events slot (blue seats · same auditorium, other angle). Kept in the inbox, not shipped.  |
| 07-software-code/…XopauR-Nagk                        | https://unsplash.com/photos/XopauR-Nagk                                                             | Clean, portrait. Not used (the landscape one is shipped).                                                          |
| 13-visa-gate/…OsBKcqTkTsk                            | https://unsplash.com/photos/OsBKcqTkTsk                                                             | **Rejected**: an airline tail logo on the aircraft in the sky and on the apron.                                    |
| 10-candidates (21 small previews)                    | unsplash.com search results                                                                         | Vetting only (900px). Not shipped.                                                                                 |
| 08-lottie: Airplane Around the World · Passport, Travel · Visa stamp passport | lottiefiles.com (links in the Part 1 brief)                                | **Not shipped** (rendered and reviewed): flat cartoon style that does not match the cinematic look; the stamp reads "VENICE · ITALY" (a country name). Replaced by our own SVG + GSAP. |
| 08-lottie/Justice_Scales_Animation_v1.json           | unknown                                                                                             | **Not shipped** (decision D): no source. The scales icon of §1.3 is our own SVG drawn with GSAP.                   |

Candidates downloaded for the take-off and rejected: Pexels 5008861 (true sunset, but 720p handheld),
855130 (airline livery), 854550 (registration on the wing), 2297218 (no take-off), 4686173 / 856486 / 4512518
(not a take-off or vertical).
