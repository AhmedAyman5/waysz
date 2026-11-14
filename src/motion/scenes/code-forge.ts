/**
 * Software page — the six services, "code that becomes something" (views/software/Services.astro).
 * Every service owns one paused timeline, driven only by scroll (so it reverses exactly):
 *   0 → 0.32   the characters of its code fly in from depth and land in their place
 *   0.36 → 0.9 the program runs: a highlight walks down the lines while the result builds itself
 *              (data-pop · data-grow · data-from · data-dim · data-hide · data-stroke, in DOM order or at data-t);
 *              wrong characters (.sw > .bad) fly out and the right ones (.sw > .good) fly in
 * Wide screens: CSS sticky holds the screen (not a pin), one ScrollTrigger gives every service its turn; the
 * first code assembles while the section arrives. Small screens: each window is scrubbed as it crosses the screen.
 * The windows are LTR in both languages: no horizontal value here is multiplied by env.dir.
 * Hidden services are faded with opacity (never visibility), so they stay reachable; a focused link scrolls
 * its service into place.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { splitChars } from '../code-glyphs';
import { lenis } from '../smooth-scroll';

const clamp01 = gsap.utils.clamp(0, 1);
const rnd = gsap.utils.random;
const RUN = [0.36, 0.9];                                      // the window of the timeline in which the program runs

function buildTimeline(svc: HTMLElement) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
  const codeBox = svc.querySelector<HTMLElement>('.win__code')!;
  const chars = splitChars(codeBox);
  const good = chars.filter((c) => c.parentElement!.classList.contains('good'));
  const bad = chars.filter((c) => c.parentElement!.classList.contains('bad'));
  const body = chars.filter((c) => !good.includes(c));
  if (bad.length) gsap.set(svc.querySelectorAll('.sw > .bad'), { opacity: 1 });      // the typo is part of the code until it is fixed

  // 1 · the code assembles
  tl.fromTo(body, {
    x: () => rnd(-240, 240), y: () => rnd(-190, 150), z: () => rnd(-620, 240),
    rotationX: () => rnd(-100, 100), rotationY: () => rnd(-100, 100), rotationZ: () => rnd(-50, 50), opacity: 0,
  }, {
    x: 0, y: 0, z: 0, rotationX: 0, rotationY: 0, rotationZ: 0, opacity: 1,
    duration: 0.16, ease: 'power3.out', stagger: { amount: 0.16, from: 'random' },
  }, 0);

  // 2 · the program runs: the highlight walks down the lines
  const run = svc.querySelector<HTMLElement>('.win__run')!;
  const lines = codeBox.querySelectorAll<HTMLElement>('.ln');
  const span = RUN[1] - RUN[0];
  tl.fromTo(run, { opacity: 0 }, { opacity: 1, duration: 0.03 }, RUN[0] - 0.02)
    .fromTo(run, { y: 0 }, { y: () => lines[lines.length - 1].offsetTop - lines[0].offsetTop, duration: span * 0.8, ease: `steps(${Math.max(lines.length - 1, 1)})` }, RUN[0])
    .to(run, { opacity: 0, duration: 0.04 }, RUN[1] - 0.02);

  // wrong characters out, right characters in
  if (bad.length) {
    const typos = svc.querySelectorAll('.sw');
    tl.fromTo(typos, { '--squig': 0 }, { '--squig': 1, duration: 0.04 }, 0.3)
      .to(bad, { x: () => rnd(-70, 70), y: () => rnd(-150, -70), z: 260, rotationZ: () => rnd(-160, 160), opacity: 0, duration: 0.16, ease: 'power2.in', stagger: 0.02 }, RUN[0] + span * 0.3)
      .fromTo(good, { x: () => rnd(-60, 60), y: () => rnd(90, 150), z: -300, rotationZ: () => rnd(-160, 160), opacity: 0 }, { x: 0, y: 0, z: 0, rotationZ: 0, opacity: 1, duration: 0.18, ease: 'back.out(1.6)', stagger: 0.02 }, RUN[0] + span * 0.42)
      .to(typos, { '--squig': 0, duration: 0.04 }, RUN[0] + span * 0.5);
  }

  // the result builds itself: in DOM order, or at its own data-t
  const parts = gsap.utils.toArray<HTMLElement | SVGElement>('[data-pop], [data-grow], [data-from], [data-dim], [data-hide], [data-stroke]', svc);
  parts.forEach((el, i) => {
    const d = el.dataset;
    const at = RUN[0] + span * (d.t !== undefined ? Number(d.t) : (i / parts.length) * 0.82);
    if (d.pop !== undefined) tl.fromTo(el, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.09, ease: 'back.out(2)' }, at);
    else if (d.grow !== undefined) tl.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 0.12, ease: 'power3.out' }, at);
    else if (d.from !== undefined) {
      const [x, y, r] = d.from.split(',').map(Number);
      tl.fromTo(el, { x, y, rotation: r, opacity: 0 }, { opacity: 1, duration: 0.05, ease: 'none' }, Math.max(at - 0.1, 0.3))
        .to(el, { x: 0, y: 0, rotation: 0, duration: 0.14, ease: 'power3.inOut' }, at);
    } else if (d.dim !== undefined) tl.fromTo(el, { opacity: 1 }, { opacity: 0.32, duration: 0.1 }, at);
    else if (d.hide !== undefined) tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: 0.06 }, at);
    else if (d.stroke !== undefined) tl.fromTo(el.tagName === 'path' ? el : el.querySelectorAll('path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.2, ease: 'power1.inOut' }, at);
  });
  tl.set({}, {}, 1);
  tl.progress(0);
  return tl;
}

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const services = gsap.utils.toArray<HTMLElement>('.svc', root);
  const ticks = gsap.utils.toArray<HTMLElement>('.forge__ticks span', root);
  const n = services.length;

  const title = root.querySelector<HTMLElement>('.forge__title')!;
  const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.1, stagger: 0.07, scrollTrigger: { trigger: root, start: 'top 70%', once: true } });

  // The timelines (hundreds of character tweens) are built only when the section is near, one per frame:
  // none of that work happens while the page loads.
  const timelines: (gsap.core.Timeline | undefined)[] = [];
  const progress = services.map(() => 0);
  const play = (i: number, p: number) => { progress[i] = p; timelines[i]?.progress(p); };
  ScrollTrigger.create({
    trigger: root, start: 'top 160%', once: true,
    onEnter: () => services.forEach((s, i) => gsap.delayedCall(i * 0.04, () => { timelines[i] = buildTimeline(s); timelines[i]!.progress(progress[i]); })),
  });
  const drawn = new Set<HTMLElement>();
  services.forEach((s) => gsap.set(s.querySelectorAll('.svc__icon > *'), { drawSVG: '0%' }));
  const draw = (s: HTMLElement) => {
    if (drawn.has(s)) return;
    drawn.add(s);
    gsap.to(s.querySelectorAll('.svc__icon > *'), { drawSVG: '100%', duration: 1.2, stagger: 0.08, ease: 'power2.inOut' });
  };

  gsap.matchMedia().add({ wide: '(min-width: 1024px)', small: '(max-width: 1023px)' }, (ctx) => {
    if (!ctx.conditions!.wide) {
      // small screens: every window is scrubbed while it crosses the screen; the text settles once
      const triggers = services.flatMap((s, i) => {
        const text = s.querySelector<HTMLElement>('.svc__text')!;
        gsap.set(text, { opacity: 0, y: 36 });
        return [
          ScrollTrigger.create({
            trigger: s.querySelector('.win'), start: 'top 92%', end: 'top 18%', scrub: 0.6,
            onUpdate: (self) => play(i, self.progress), onRefresh: (self) => play(i, self.progress),
          }),
          ScrollTrigger.create({ trigger: text, start: 'top 86%', once: true, onEnter: () => { draw(s); gsap.to(text, { opacity: 1, y: 0, duration: 0.9 }); } }),
        ];
      });
      return () => {
        triggers.forEach((t) => t.kill());
        gsap.set(services.map((s) => s.querySelector('.svc__text')), { clearProps: 'all' });
      };
    }

    root.classList.add('is-scrub');
    const texts = services.map((s) => s.querySelector<HTMLElement>('.svc__text')!);
    const wins = services.map((s) => s.querySelector<HTMLElement>('.win')!);
    let approach = 0, active = -1;
    const update = (p: number) => {
      const u = p * n;
      let now = 0;
      services.forEach((s, i) => {
        const local = u - i;                                              // 0…1 = this service's turn
        const enter = i === 0 ? 1 : clamp01((local + 0.07) / 0.14);          // overlaps the exit of the one before
        const exit = i === n - 1 ? 0 : clamp01((local - 0.88) / 0.12);
        const on = enter * (1 - exit);
        gsap.set(s, { opacity: on });
        gsap.set(texts[i], { y: (1 - enter) * 60 - exit * 60 });
        gsap.set(wins[i], { y: -exit * 90, rotationX: exit * 14, scale: 1 - exit * 0.06, transformPerspective: 1200 });
        // the first code already assembles while the section arrives
        play(i, i === 0 ? 0.42 * approach + 0.58 * clamp01(local / 0.5) : clamp01((local - 0.04) / 0.58));
        if (local >= -0.02) now = i;
      });
      if (now !== active) {
        active = now;
        services.forEach((s, i) => s.classList.toggle('is-active', i === now));
        ticks.forEach((t, i) => t.classList.toggle('is-on', i === now));
      }
      if (p > 0 || approach > 0.5) draw(services[now]);
    };
    const arrive = ScrollTrigger.create({
      trigger: root, start: 'top 85%', end: 'top top', scrub: 0.6,
      onUpdate: (self) => { approach = self.progress; update(st?.progress ?? 0); },
      onRefresh: (self) => { approach = self.progress; },
    });
    const st: ScrollTrigger = ScrollTrigger.create({
      trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.6,
      onUpdate: (self) => update(self.progress), onRefresh: (self) => update(self.progress),
    });
    // keyboard: a focused link brings its service to its resting moment
    const onFocus = (e: FocusEvent) => {
      const i = services.indexOf((e.target as Element).closest<HTMLElement>('.svc')!);
      if (i < 0 || i === active) return;
      const y = st.start + ((i + 0.7) / n) * (st.end - st.start);
      if (lenis) lenis.scrollTo(y, { duration: 0.8 }); else window.scrollTo(0, y);
    };
    root.addEventListener('focusin', onFocus);
    return () => {
      root.removeEventListener('focusin', onFocus);
      arrive.kill();
      st.kill();
      root.classList.remove('is-scrub');
      services.forEach((s) => s.classList.remove('is-active'));
      gsap.set([...services, ...texts, ...wins], { clearProps: 'all' });
      services.forEach((_, i) => play(i, 1));
    };
  });
};
export default scene;
