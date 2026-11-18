/**
 * Events page — the eight event types on the turntable (views/events/Types.astro). Sticky + scrubbed, not a pin.
 * Scroll maps to a staircase: each type RESTS at the front for a while, then the turntable turns to the next
 * (bridge `gala.turn`, read by the act `gala`). The DOM shows the type at the front: the types take turns with
 * opacity (all of them stay in the accessibility tree); the ticks show which one is on.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { gala } from '../stage/bridge';

const clamp01 = gsap.utils.clamp(0, 1);

const scene: Scene = (root, env) => {
  const items = gsap.utils.toArray<HTMLElement>('.gtype', root);
  const ticks = gsap.utils.toArray<HTMLElement>('.gtypes__ticks span', root);
  const n = items.length;
  // a staircase: each type has an equal share of the scroll; it rests at the front for the first 55% of its share,
  // then the turntable turns to the next one
  const stair = (p: number) => {
    const x = clamp01(p) * n, i = Math.min(Math.floor(x), n - 1), f = x - i;
    const move = clamp01((f - 0.55) / 0.45);
    return Math.min(i + move * move * (3 - 2 * move), n - 1);
  };
  const shift = (el: HTMLElement, d: number) => gsap.set(el, { opacity: clamp01(1 - Math.abs(d) * 2.4), y: d * 36 });
  let last = -1;
  const paint = (turn: number) => {
    items.forEach((el, i) => shift(el, i - turn));
    const on = Math.round(turn);
    if (on !== last) { last = on; ticks.forEach((t, i) => t.classList.toggle('is-on', i === on)); }
  };
  paint(0);
  ScrollTrigger.create({
    trigger: root, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => { gala.turn = stair(self.progress); paint(gala.turn); },
    onRefresh: (self) => { gala.turn = stair(self.progress); paint(gala.turn); },
  });
  void env;

  const title = root.querySelector<HTMLElement>('.gtypes__title')!;
  const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 55%', once: true } })
    .fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.2, stagger: 0.08 });
};
export default scene;
