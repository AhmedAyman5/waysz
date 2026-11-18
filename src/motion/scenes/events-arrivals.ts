/**
 * Events page — the split-flap arrivals board (views/events/Arrivals.astro).
 * Each cell becomes tiles: Latin text one tile per CHARACTER (padded to a fixed width, so the board keeps its
 * shape); Arabic one tile per WHOLE WORD (Arabic is never split into letters). A tile flips like the real thing: the
 * old top half falls on its hinge, the new bottom half comes down after it, with a few random stops on the way.
 * On arrival the whole board "boots" once; then scrolling flips the status column through the stages of a welcome
 * (the section's `data-states`). Scrubbed by position, so scrolling back flips it back. Decorative (aria-hidden).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';

const LATIN = 'ABCDEFGHIJKLMNOPRSTUVWXYZ';

const scene: Scene = (root) => {
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
  const board = cells.map((cell, k) => ({ cell, col: k % 3, tiles: build(cell, k % 3, cell.dataset.text ?? '') }));
  const status = board.filter((b) => b.col === 2);

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
  const setCell = (b: (typeof board)[number], text: string, delay: number, stops: number) => {
    // a cell that is still flipping finishes at once: two flips never fight over the same tiles
    running.get(b.cell)?.progress(1).kill();
    const tl = gsap.timeline({ onComplete: () => { running.delete(b.cell); } });
    running.set(b.cell, tl);
    const want = units(text, b.col);
    b.tiles.forEach((t, i) => roll(t, want[i] ?? '', delay + i * (latin ? 0.035 : 0.12), tl, want[i]?.trim() || t.now.trim() ? stops : 0));
    return tl;
  };
  board.forEach((b) => b.tiles.forEach((t) => gsap.set(t.layers.slice(2), { opacity: 0, transformPerspective: 260 })));

  // start: the first stage of the scroll, then the board boots once on arrival
  status.forEach((b, r) => b.tiles.forEach((t, i) => { const u = units(states[0][r], 2)[i] ?? ''; [0, 1, 2, 3].forEach((l) => write(t, l, u)); t.now = u; }));
  let stage = 0, booted = false;
  ScrollTrigger.create({
    trigger: root, start: 'top 72%', once: true,
    onEnter: () => {
      booted = true;
      board.forEach((b, k) => setCell(b, b.col === 2 ? states[stage][Math.floor(k / 3)] : (b.cell.dataset.text ?? ''), k * 0.05, latin ? 3 : 2));
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
      status.forEach((b, r) => setCell(b, states[stage][r], r * 0.08, latin ? 2 : 1));
    },
  });

  const title = root.querySelector<HTMLElement>('.garr__title')!;
  const tw = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 60%', once: true } })
    .fromTo(tw, { yPercent: 118 }, { yPercent: 0, duration: 1.2, stagger: 0.08 })
    .fromTo(root.querySelectorAll('.garr__item'), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, 0.3)
    .fromTo(root.querySelector('.garr__board'), { rotationX: 18, y: 40, transformPerspective: 1200 }, { rotationX: 0, y: 0, duration: 1.6 }, 0);
};
export default scene;
