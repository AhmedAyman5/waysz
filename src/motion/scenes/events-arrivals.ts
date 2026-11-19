/**
 * Events page — the split-flap arrivals board (views/events/Arrivals.astro).
 * Each cell becomes tiles: Latin text one tile per CHARACTER (padded to a fixed width, so the board keeps its
 * shape); Arabic one tile per WHOLE WORD (Arabic is never split into letters). A tile flips like the real thing: the
 * old top half falls on its hinge, the new bottom half comes down after it, with a few random stops on the way.
 * On arrival the whole board "boots" once; then scrolling flips the status column through the stages of a welcome
 * (the section's `data-states`). Scrubbed by position, so scrolling back flips it back. Decorative (aria-hidden).
 * The tiles (hundreds of small elements) are built only when the section comes near — nothing at page load.
 * Set up only when the section comes near (motion/near.ts): nothing of it runs during page load.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { whenNear } from '../near';

const LATIN = 'ABCDEFGHIJKLMNOPRSTUVWXYZ';

const scene: Scene = (root) => {
  whenNear(root, () => {
    const latin = root.hasAttribute('data-latin');
    const states: string[][] = JSON.parse(root.dataset.states ?? '[]');
    const widths: number[] = JSON.parse(root.dataset.width ?? '[]');
    const cells = gsap.utils.toArray<HTMLElement>('.garr__cell', root);
    const words = [...new Set(cells.flatMap((c) => (c.dataset.text ?? '').split(' ')).concat(states.flat().flatMap((s) => s.split(' '))))].filter(Boolean);

    const units = (text: string, col: number): string[] => {
      if (!latin) { const w = text.split(' '); while (w.length < 2 && col === 2) w.push(''); return w; }
      return text.toUpperCase().padEnd(widths[col] ?? text.length, ' ').split('');
    };
    type Tile = { el: HTMLElement; now: string; layers: HTMLElement[]; busy?: gsap.core.Timeline };
    const layer = (cls: string) => { const s = document.createElement('span'); s.className = `flap__${cls}`; return s; };
    const write = (t: Tile, i: number, v: string) => { t.layers[i].textContent = v || ' '; };
    const build = (cell: HTMLElement, col: number, text: string): Tile[] => {
      cell.textContent = '';
      return units(text, col).map((u) => {
        const el = document.createElement('span');
        el.className = latin ? 'flap' : 'flap flap--word';
        const layers = [layer('top'), layer('bot'), layer('fall'), layer('rise')];   // static top · static bottom · falling old top · rising new bottom
        el.append(...layers);
        const tile = { el, now: u, layers };
        layers.forEach((_, i) => write(tile, i, u));
        cell.append(el);
        return tile;
      });
    };
    type Cell = { cell: HTMLElement; col: number; tiles: Tile[] };
    let board: Cell[] = [], status: Cell[] = [];

    // one flip: the old top half falls away (0 → -90°) and the new bottom half follows (90° → 0)
    const flipTo = (t: Tile, next: string, at: number, tl: gsap.core.Timeline) => {
      const [top, bot, fall, rise] = t.layers;
      tl.call(() => { write(t, 2, t.now); write(t, 0, next); write(t, 3, next); gsap.set(fall, { rotationX: 0, opacity: 1 }); gsap.set(rise, { rotationX: 90, opacity: 1 }); }, [], at)
        .to(fall, { rotationX: -90, duration: 0.07, ease: 'power1.in' }, at)
        .to(rise, { rotationX: 0, duration: 0.07, ease: 'power1.out' }, at + 0.07)
        .call(() => { write(t, 1, next); t.now = next; gsap.set([fall, rise], { opacity: 0 }); }, [], at + 0.14);
      void top; void bot;
    };
    const roll = (t: Tile, target: string, delay: number, tl: gsap.core.Timeline, stops: number) => {
      if (t.now === target && stops === 0) return;
      let at = delay;
      for (let s = 0; s < stops; s++) {
        const r = latin ? (target === ' ' ? ' ' : LATIN[Math.floor(Math.random() * LATIN.length)]) : words[Math.floor(Math.random() * words.length)];
        flipTo(t, r, at, tl); at += 0.15;
      }
      flipTo(t, target, at, tl);
    };
    const running = new Map<HTMLElement, gsap.core.Timeline>();
    const setCell = (b: Cell, text: string, delay: number, stops: number, force = false) => {
      // a cell that is still flipping finishes at once: two flips never fight over the same tiles
      running.get(b.cell)?.progress(1).kill();
      const tl = gsap.timeline({ onComplete: () => { running.delete(b.cell); } });
      running.set(b.cell, tl);
      const want = units(text, b.col);
      // only tiles whose letter / word changes flip; a blank that stays blank does nothing
    b.tiles.forEach((t, i) => { if ((want[i] ?? '') !== t.now || (force && (want[i] ?? '').trim())) roll(t, want[i] ?? '', delay + i * (latin ? 0.05 : 0.12), tl, stops); });
      return tl;
    };
    let stage = 0, booted = false, built = false, done = false;
    const ready: (() => void)[] = [];
    const whenBuilt = (fn: () => void) => { if (done) fn(); else ready.push(fn); };
    // the tiles, built once the section is near; they start on the first stage of the scroll
    const make = () => {
      if (built) return;
      built = true;
      // one cell per frame: hundreds of small elements, never in one long task
      const queue = cells.map((cell, k) => () => {
        const b: Cell = { cell, col: k % 3, tiles: build(cell, k % 3, cell.dataset.text ?? '') };
        b.tiles.forEach((t) => gsap.set(t.layers.slice(2), { opacity: 0, transformPerspective: 260 }));
        if (b.col === 2) {
          const r = Math.floor(k / 3);
          b.tiles.forEach((t, i) => { const u = units(states[stage][r], 2)[i] ?? ''; [0, 1, 2, 3].forEach((l) => write(t, l, u)); t.now = u; });
          status.push(b);
        }
        board.push(b);
      });
      const step = () => { queue.shift()?.(); if (queue.length) requestAnimationFrame(step); else { done = true; ready.splice(0).forEach((fn) => fn()); } };
      requestAnimationFrame(step);
    };
    ScrollTrigger.create({ trigger: root, start: 'top 220%', once: true, onEnter: make });
    ScrollTrigger.create({
      trigger: root, start: 'top 72%', once: true,
      onEnter: () => {
        make();
        whenBuilt(() => {
          booted = true;
          // each cell's flips are created in their own frame (hundreds of tweens, never in one task)
        board.forEach((b, k) => gsap.delayedCall(k * 0.09, () => setCell(b, b.col === 2 ? states[stage][Math.floor(k / 3)] : (b.cell.dataset.text ?? ''), 0, latin ? 2 : 1, true)));
        });
      },
    });
    const wide = window.matchMedia('(min-width: 1024px)');
    ScrollTrigger.create({
      trigger: root, start: () => (wide.matches ? 'top top' : 'top 60%'), end: () => (wide.matches ? 'bottom bottom' : 'bottom 40%'),
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const next = Math.min(states.length - 1, Math.floor(self.progress * states.length * 0.999 + (self.progress > 0.12 ? 0.6 : 0)));
        if (next === stage || !booted) return;
        stage = next;
        status.forEach((b, r) => gsap.delayedCall(r * 0.14, () => setCell(b, states[stage][r], 0, 1)));
      },
    });

    const title = root.querySelector<HTMLElement>('.garr__title')!;
    const tw = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
    gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 60%', once: true } })
      .fromTo(tw, { yPercent: 118 }, { yPercent: 0, duration: 1.2, stagger: 0.08 })
      .fromTo(root.querySelectorAll('.garr__item'), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, 0.3)
      .fromTo(root.querySelector('.garr__board'), { rotationX: 18, y: 40, transformPerspective: 1200 }, { rotationX: 0, y: 0, duration: 1.6 }, 0);
  });
};
export default scene;
