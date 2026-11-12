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

## Checked and NOT shipped

| File in media-inbox                                  | Source URL                                                                                          | Decision                                                                                                           |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 02-takeoff/12254086_1920_1080_60fps.mp4              | https://www.pexels.com/video/indira-gandhi-international-airport-airplane-take-off-27890134/        | **Dropped**: readable airline name on the fuselage + tail logo, grey haze, small plane. Replaced by Pexels 3723453. |
| 03-clouds/pexels-brett-sayles-4095255.jpg            | https://www.pexels.com/photo/black-woods-on-mountain-in-mist-4095255/                               | Clean, not needed in Part 1.                                                                                       |
| 04-legal-justice (2 photos)                          | unsplash.com … YFz39MOmxnQ · SUp2xgMvyXQ                                                            | Clean. Part 2 (§1.3). Re-download at 2400px (current files are small previews).                                    |
| 05-travel-passport/photo-1530469525856…              | unsplash.com … jXxdtXFEjcc                                                                          | **Replace** (decision C): recognizable national passport cover. Use a generic travel shot.                         |
| 05-travel-passport/photo-1767710096520…              | unsplash.com … s7o9S4RtYHc                                                                          | Usable after cropping the advert at the edge. Part 2 (§1.7).                                                       |
| 06-events-hall (2 photos)                            | unsplash.com … KVvEpFVq_-U · dJICd7b_LlE                                                            | **Replace** (decision E): readable brands, country names, speaker portraits.                                       |
| 07-software-code (2 photos)                          | unsplash.com … XopauR-Nagk · 5sLNGV2EFRM                                                            | Clean. Part 2 (§1.3). Re-download the landscape one at 2400px.                                                     |
| 08-lottie: Airplane Around the World · Passport, Travel · Visa stamp passport | lottiefiles.com (links in the Part 1 brief)                                | Clean vector files. Part 2 (§1.3, §1.7).                                                                           |
| 08-lottie/Justice_Scales_Animation_v1.json           | unknown                                                                                             | **Replace** (decision D): no source. A free LottieFiles scales animation will be credited here in Part 2.          |

Candidates downloaded for the take-off and rejected: Pexels 5008861 (true sunset, but 720p handheld),
855130 (airline livery), 854550 (registration on the wing), 2297218 (no take-off), 4686173 / 856486 / 4512518
(not a take-off or vertical).
