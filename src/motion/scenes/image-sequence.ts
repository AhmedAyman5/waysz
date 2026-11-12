/**
 * Scroll-scrubbed image sequence (ImageSequence.astro) — Home §1.2b "The Journey".
 * Pinned; scroll plays the footage frame by frame; captions take turns at their data-at points.
 * Draws on its own 2D canvas, or hands the frame to the WebGL stage when that is live (data-veil = Home).
 * Frames load in order, only once the section is near (see the trigger below). Reduced motion: CSS still + captions.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Scene } from '../index';
import { BP } from '../config';
import { flight, onStageLive } from '../stage/bridge';

const PARALLEL = 3;
const clamp01 = gsap.utils.clamp(0, 1);

const scene: Scene = (root, env) => {
  if (env.reduce) return;

  const small = matchMedia(BP.mobile).matches;
  const mobileSet = small && !!root.dataset.mobile && Number(root.dataset.mobileFrames) > 0;
  const name = mobileSet ? root.dataset.mobile! : root.dataset.name!;
  const total = mobileSet ? Number(root.dataset.mobileFrames) : Number(root.dataset.frames);
  const step = small && !mobileSet ? Math.max(1, Number(root.dataset.mobileStep) || 2) : 1;
  const count = Math.ceil(total / step);
  const linked = root.hasAttribute('data-veil');          // Home: cloud white-out + WebGL stage

  const view = root.querySelector<HTMLElement>('.seq__view')!;
  const canvas = root.querySelector<HTMLCanvasElement>('.seq__canvas')!;
  const veil = root.querySelector<HTMLElement>('.seq__veil');
  const scrim = root.querySelector<HTMLElement>('.seq__scrim')!;
  const ticksBox = root.querySelector<HTMLElement>('.seq__ticks')!;
  const captions = gsap.utils.toArray<HTMLElement>('.seq__caption', root);
  const ctx = canvas.getContext('2d', { alpha: false })!;
  let [fx, fy] = (getComputedStyle(root).getPropertyValue('--focus') || '50% 50%')
    .trim().split(/\s+/).map((v) => parseFloat(v) / 100);
  if (mobileSet) fx = 0.5;                                 // the mobile set is already cropped around the focus

  // ---------- frames ----------
  // Files are downloaded once and kept as compressed Blobs (cheap). Only a sliding WINDOW of frames around the
  // current one is kept decoded as ImageBitmaps: decoding happens off the main thread, drawing a bitmap
  // never blocks, and memory stays flat however long the sequence is.
  const WINDOW = small ? 8 : 12;
  const blobs: (Blob | undefined)[] = new Array(count);
  const bitmaps = new Map<number, ImageBitmap>();
  const pending = new Set<number>();
  const url = (i: number) => `/media/seq/${name}/frame_${String(i * step + 1).padStart(4, '0')}.webp`;
  let current = 0;
  let shown: ImageBitmap | null = null;
  let next = 0;

  const nearest = () => {
    let best: ImageBitmap | null = null, gap = Infinity;
    bitmaps.forEach((bmp, i) => { const d = Math.abs(i - current); if (d < gap) { gap = d; best = bmp; } });
    return best as ImageBitmap | null;
  };

  const paint = (force = false) => {
    const bmp = nearest();
    if (!bmp || (bmp === shown && !force)) return;
    shown = bmp;
    if (linked) { flight.frame = bmp; flight.frameFocus = fx; flight.frameId++; }
    if (linked && flight.live) return;                    // the stage draws it
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / bmp.width, ch / bmp.height);
    const w = bmp.width * s, h = bmp.height * s;
    ctx.drawImage(bmp, (cw - w) * fx, (ch - h) * fy, w, h);
  };

  const decode = (i: number) => {
    const blob = blobs[i];
    if (!blob || bitmaps.has(i) || pending.has(i)) return;
    pending.add(i);
    createImageBitmap(blob)                                // from a Blob = decoded off the main thread
      .then((bmp) => {
        if (Math.abs(i - current) > WINDOW + 2) { bmp.close(); return; }   // scrolled away meanwhile
        bitmaps.set(i, bmp);
        paint();
      })
      .catch(() => { /* a broken frame is skipped: the nearest one is shown */ })
      .finally(() => pending.delete(i));
  };

  /** keep the window around `current` decoded, free everything else */
  const refill = () => {
    for (let d = 0; d <= WINDOW; d++) { decode(current + d); if (d) decode(current - d); }
    bitmaps.forEach((bmp, i) => {
      if (Math.abs(i - current) > WINDOW + 2 && bmp !== shown) { bmp.close(); bitmaps.delete(i); }
    });
  };

  const loadOne = () => {
    if (next >= count) return;
    const i = next++;
    fetch(url(i))
      .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
      .then((blob) => { blobs[i] = blob; if (Math.abs(i - current) <= WINDOW) decode(i); })
      .catch(() => { /* a missing frame is skipped: the nearest one is shown */ })
      .finally(loadOne);
  };
  // Nothing below the fold loads early. Home: the section overlaps the hero, so "near" = the visitor
  // has started to scroll; elsewhere = within two viewports.
  ScrollTrigger.create({
    trigger: root, start: linked ? 'top 86%' : 'top 300%', once: true,
    onEnter: () => { for (let k = 0; k < PARALLEL; k++) loadOne(); },
  });

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    canvas.width = Math.round(view.clientWidth * dpr);
    canvas.height = Math.round(view.clientHeight * dpr);
    paint(true);
  };
  new ResizeObserver(resize).observe(view);
  if (linked) onStageLive(() => paint(true));

  // ---------- captions + pin ----------
  root.classList.add('is-scrub');
  gsap.set(captions, { autoAlpha: 0 });
  if (linked) {
    // Home: the section overlaps the end of the hero, so it stays invisible until its pin starts
    gsap.set(view, { autoAlpha: 0 });
    gsap.set([scrim, ticksBox], { autoAlpha: 0 });
    if (veil) gsap.set(veil, { autoAlpha: 1 });
  }
  const ats = captions.map((c) => Number(c.dataset.at) || 0);
  const ticks = captions.map(() => ticksBox.appendChild(document.createElement('span')));
  const outro = linked ? 0.86 : 1;                         // the last caption leaves before the white-out
  let active = -1;

  gsap.matchMedia().add({ desktop: BP.desktop, mobile: BP.mobile }, (mq) => {
    const { desktop } = mq.conditions!;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: desktop ? '+=300%' : '+=180%',
        pin: true,
        scrub: 0.5,
        onToggle: (self) => {
          if (!linked) return;
          const on = self.isActive || self.progress === 1;
          flight.mix = on ? 1 : 0;
          gsap.set(view, { autoAlpha: on ? 1 : 0 });
        },
        onUpdate: (self) => {
          const p = self.progress;
          current = Math.round(p * (count - 1));
          refill();
          paint();
          const now = ats.findLastIndex((a, i) => p >= a && p < (ats[i + 1] ?? outro));
          if (now !== active) { active = now; ticks.forEach((t, i) => t.classList.toggle('is-on', i === now)); }
          if (!linked) return;
          const v = clamp01(Math.max(1 - p / 0.1, (p - 0.88) / 0.12));
          flight.veil = v;
          flight.veilPage = p > 0.5 ? 1 : 0;
          flight.speed = Math.sin(Math.PI * clamp01(p / 0.55));   // ground roll → lift-off
          if (veil) gsap.set(veil, { autoAlpha: v });
          gsap.set([scrim, ticksBox], { autoAlpha: 1 - clamp01(v * 2.5) });   // no dark gradient inside the white-out
        },
      },
    });
    captions.forEach((c, i) => {
      const end = ats[i + 1] ?? outro;
      tl.fromTo(c, { autoAlpha: 0, y: 48 }, { autoAlpha: 1, y: 0, duration: 0.07, ease: 'power2.out' }, ats[i])
        .to(c, { autoAlpha: 0, y: -32, duration: 0.05, ease: 'power2.in' }, end - 0.05);
    });
    tl.set({}, {}, 1);                                       // timeline length = scroll length
  });
};
export default scene;
