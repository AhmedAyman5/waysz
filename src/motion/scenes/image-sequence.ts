/**
 * Scroll-scrubbed image sequence (ImageSequence.astro) — Home §1.2b "The Journey".
 * Pinned; scroll plays the footage frame by frame; captions take turns at their data-at points.
 * Draws on its own 2D canvas, or hands the frame to the WebGL stage when that is live (data-veil = Home).
 * Frames load in order, only once the section is within two viewports. Reduced motion: CSS still + captions.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Scene } from '../index';
import { BP } from '../config';
import { flight, onStageLive } from '../stage/bridge';

const PARALLEL = 4;
const clamp01 = gsap.utils.clamp(0, 1);

const scene: Scene = (root, env) => {
  if (env.reduce) return;

  const name = root.dataset.name!;
  const total = Number(root.dataset.frames);
  const small = matchMedia(BP.mobile).matches;
  const step = small ? Math.max(1, Number(root.dataset.mobileStep) || 2) : 1;
  const count = Math.ceil(total / step);
  const linked = root.hasAttribute('data-veil');          // Home: cloud white-out + WebGL stage

  const view = root.querySelector<HTMLElement>('.seq__view')!;
  const canvas = root.querySelector<HTMLCanvasElement>('.seq__canvas')!;
  const veil = root.querySelector<HTMLElement>('.seq__veil');
  const scrim = root.querySelector<HTMLElement>('.seq__scrim')!;
  const ticksBox = root.querySelector<HTMLElement>('.seq__ticks')!;
  const captions = gsap.utils.toArray<HTMLElement>('.seq__caption', root);
  const ctx = canvas.getContext('2d', { alpha: false })!;
  const [fx, fy] = (getComputedStyle(root).getPropertyValue('--focus') || '50% 50%')
    .trim().split(/\s+/).map((v) => parseFloat(v) / 100);

  // ---------- frames ----------
  const images: (HTMLImageElement | undefined)[] = new Array(count);
  const url = (i: number) => `/media/seq/${name}/frame_${String(i * step + 1).padStart(4, '0')}.webp`;
  let current = 0;
  let shown: HTMLImageElement | null = null;
  let next = 0;

  const nearest = (i: number) => {
    for (let d = 0; d < count; d++) {
      const img = images[i - d] ?? images[i + d];
      if (img) return img;
    }
    return null;
  };

  const paint = (force = false) => {
    const img = nearest(current);
    if (!img || (img === shown && !force)) return;
    shown = img;
    if (linked) { flight.frame = img; flight.frameId++; }
    if (linked && flight.live) return;                    // the stage draws it
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) * fx, (ch - h) * fy, w, h);
  };

  const loadOne = () => {
    if (next >= count) return;
    const i = next++;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { images[i] = img; if (Math.abs(i - current) < 3 || !shown) paint(); loadOne(); };
    img.onerror = loadOne;
    img.src = url(i);
  };
  ScrollTrigger.create({
    trigger: root, start: 'top 300%', once: true,
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
