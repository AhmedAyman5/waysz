---
name: waysz-media
description: How WaysZ finds, licenses, optimizes and ships photos, videos, image sequences and Lottie files — approved free sources, license rules, the shot list per section, ffmpeg recipes, file naming, size budgets, and the credits log. Use whenever adding, replacing, downloading, converting or compressing ANY image, video, frame sequence or Lottie animation.
---

# WaysZ Media Pipeline

## 1 · Approved sources (free, commercial use OK)

| Source                                                                                                     | Use for                               | Rules                                                                                                      |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| pexels.com (photos + videos)                                                                               | hero/background video, area photos    | no attribution needed; no identifiable people shown badly; no implied endorsement; not in logos/trademarks |
| mixkit.co (videos)                                                                                         | cinematic clips                       | ONLY clips marked "Free License" — never "Restricted License"                                              |
| pixabay.com (photos, PNGs, videos)                                                                         | transparent cloud PNGs, extra footage | free commercial use; same people/endorsement rules                                                         |
| lottiefiles.com (free animations)                                                                          | icons & small moments                 | free animations only (Lottie Simple License); download as "Lottie JSON"                                    |
| Never: Google Images, Pinterest, YouTube rips, AI images of real people, anything without a clear license. |

## 2 · Content rules

- No airline liveries or logos on planes, no visible brands/logos on products or screens.
- No identifiable faces in a way that suggests they endorse WaysZ (prefer hands, backs, silhouettes, wide shots).
- Calm, premium, consistent grade: dusk/golden hour, deep blues, warm highlights (matches the palette).
- Footage must loop cleanly (or be trimmed to a clean loop) for background use.

## 3 · Folders & naming

```
media-inbox/                      raw downloads (gitignored) — keep original names + note the URL
public/media/video/<name>.mp4     + <name>.webm + <name>-poster.webp   (+ <name>-m.* mobile variant)
public/media/seq/<name>/frame_0001.webp …
public/media/lottie/<name>.json
src/assets/media/<area>-<subject>.jpg   (Astro <Image> converts to webp/avif)
```

Names: lowercase, hyphens, English: `hero-clouds`, `legal-justice`, `travel-passport`, `events-hall`.

## 4 · Shot list (search terms) — download into media-inbox/

| Slot               | Type         | Search terms (Pexels / Mixkit)                                                                 | Target           |
| ------------------ | ------------ | ---------------------------------------------------------------------------------------------- | ---------------- |
| hero-clouds        | video 10–20s | "airplane above clouds sunset", "flying above clouds", "airplane wing sunset"                  | 1080p, no logo   |
| takeoff (sequence) | video 4–6s   | "airplane takeoff runway", "plane taking off sunset", "flying through clouds"                  | 1080p, steady    |
| clouds             | PNG ×3       | Pixabay "cloud png transparent"                                                                | 2000px wide      |
| legal-justice      | photo/video  | "scales of justice", "lady justice statue", "gavel courtroom"                                  | landscape 2400px |
| travel-passport    | photo/video  | "passport boarding pass", "airport departure board", "airplane window view"                    |                  |
| events-hall        | photo/video  | "conference hall stage", "exhibition hall", "business conference audience"                     | wide shot        |
| software-code      | photo/video  | "code on screen dark", "developer laptop night"                                                | no brand logos   |
| why-wide           | photo        | "modern office meeting room", "team working city view"                                         | wide             |
| route-map          | photo        | "world map dark", "night flight city lights"                                                   |                  |
| cta-dusk           | video 10s    | "city skyline dusk timelapse", "office window city night"                                      |                  |
| gate-airport       | photo        | "airport terminal window plane"                                                                |                  |
| Lottie             | JSON         | "airplane", "paper plane", "scales of justice", "passport", "conference", "code", "check mark" | small, simple    |

## 5 · Optimizing (ffmpeg — install once on Windows: `winget install Gyan.FFmpeg`)

```bash
# Background video (desktop) — no audio, 1920 wide, small, starts fast
ffmpeg -i media-inbox/in.mp4 -an -vf "scale=1920:-2,fps=30" -c:v libx264 -crf 27 -preset slow -pix_fmt yuv420p -movflags +faststart public/media/video/NAME.mp4
ffmpeg -i media-inbox/in.mp4 -an -vf "scale=1920:-2,fps=30" -c:v libvpx-vp9 -crf 36 -b:v 0 public/media/video/NAME.webm
# Mobile variant — 960 wide
ffmpeg -i media-inbox/in.mp4 -an -vf "scale=960:-2,fps=30" -c:v libx264 -crf 29 -preset slow -pix_fmt yuv420p -movflags +faststart public/media/video/NAME-m.mp4
# Poster (first frame)
ffmpeg -i public/media/video/NAME.mp4 -frames:v 1 -vf "scale=1920:-2" -q:v 80 public/media/video/NAME-poster.webp
# Trim a clip (start at 3s, keep 12s)
ffmpeg -ss 3 -i media-inbox/in.mp4 -t 12 -c copy media-inbox/in-trim.mp4
# Image sequence (≈120 frames for a 5s clip at 24fps), 1600 wide WebP
mkdir public/media/seq/NAME
ffmpeg -i media-inbox/in.mp4 -an -vf "fps=24,scale=1600:-2" -c:v libwebp -quality 70 public/media/seq/NAME/frame_%04d.webp
```

## 6 · Budgets (hard limits)

| Asset                                                                                       | Limit                                                             |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| background video desktop                                                                    | ≤ 3 MB (mp4) · ≤ 20s                                              |
| background video mobile                                                                     | ≤ 1.2 MB                                                          |
| image sequence                                                                              | ≤ 150 frames · each ≤ 60 KB · total ≤ 7 MB (loaded progressively) |
| photo (source in src/assets)                                                                | ≤ 2400px wide; Astro outputs responsive webp/avif                 |
| Lottie JSON                                                                                 | ≤ 150 KB each                                                     |
| initial page load                                                                           | ≤ 4 MB desktop · ≤ 2 MB mobile                                    |
| If over budget: lower resolution/CRF/quality, shorten, or use fewer frames — in that order. |

## 7 · Credits log — `docs/media-credits.md`

Every shipped file gets one row (create the file if missing):

```markdown
| File                               | Source URL                     | Author | License        | Downloaded |
| ---------------------------------- | ------------------------------ | ------ | -------------- | ---------- |
| public/media/video/hero-clouds.mp4 | https://www.pexels.com/video/… | Name   | Pexels License | 2026-11-08 |
```
