/**
 * Events page — interpretation and the LED wall (views/events/Interpret.astro). Sticky + scrubbed, not a pin.
 * Beat 1 (first half): the sound waves of the act `gala` stream from the interpreter booths (`gala.waves`); the SVG
 * headset pulses (CSS) and the sentence turns between Arabic and English WORD BY WORD (whole words: Arabic is never
 * split into letters) — a loop that only runs while the section is on screen.
 * Beat 2 (second half): the camera turns and sweeps past the LED wall; the text about live streaming takes over.
 * The beats take turns with opacity (both stay in the accessibility tree); `.is-active` gives the pointer to one.
 * Set up only when the section comes near (motion/near.ts): nothing of it runs during page load.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { whenNear } from '../near';
import { gala } from '../stage/bridge';

const clamp01 = gsap.utils.clamp(0, 1);
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

const scene: Scene = (root) => {
  whenNear(root, () => {
    const q = gsap.utils.selector(root);
    const [a, b] = q('.gint__beat') as HTMLElement[];

    // the turning sentence: the Arabic words fold away one by one as the English ones arrive, then back
    const ar = q('.gint__line--ar .gint__w'), en = q('.gint__line--en .gint__w');
    gsap.set(en, { rotationX: -90, opacity: 0, transformPerspective: 400 });
    gsap.set(ar, { transformPerspective: 400 });
    const turn = (out: Element[], inn: Element[]) => gsap.timeline()
      .to(out, { rotationX: 90, opacity: 0, duration: 0.42, stagger: 0.16, ease: 'power2.in' })
      .fromTo(inn, { rotationX: -90, opacity: 0 }, { rotationX: 0, opacity: 1, duration: 0.5, stagger: 0.16, ease: 'power3.out' }, 0.22);
    const loop = gsap.timeline({ repeat: -1, paused: true, repeatDelay: 1.2 })
      .add(turn(ar, en), 1.4)
      .add(turn(en, ar), '+=1.8');
    ScrollTrigger.create({ trigger: root, start: 'top 80%', end: 'bottom 20%', onToggle: (self) => { if (self.isActive) loop.play(); else loop.pause(); } });

    let onFirst: boolean | null = null;
    const beats = gsap.timeline({ defaults: { ease: 'none' }, paused: true })
      .fromTo(b, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.1 }, 0.55)
      .to(a, { opacity: 0, y: -40, duration: 0.1 }, 0.5)
      .set({}, {}, 1);
    const st = ScrollTrigger.create({
      trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.4, animation: beats,
      onUpdate: (self) => {
        const p = self.progress;
        gala.waves = span(p, 0.02, 0.12) * (1 - span(p, 0.42, 0.54));
        const first = p < 0.52;
        if (first !== onFirst) { onFirst = first; a.classList.toggle('is-active', first); b.classList.toggle('is-active', !first); }
      },
      onLeaveBack: () => { gala.waves = 0; },
      onLeave: () => { gala.waves = 0; },
    });
    // keyboard focus on a link of the other beat brings that beat into view
    [a, b].forEach((beat, k) => beat.addEventListener('focusin', () => {
      const want = st.start + (st.end - st.start) * (k ? 0.75 : 0.25);
      if (Math.abs(window.scrollY - want) > window.innerHeight * 0.6 && beat.classList.contains('is-active') === false) window.scrollTo(0, want);
    }));

    const title = root.querySelector<HTMLElement>('.gint__title')!;
    const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
    gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 55%', once: true } })
      .fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.2, stagger: 0.08 })
      .fromTo(q('.gint__set'), { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2 }, 0.1)
      .fromTo(q('.gint__band'), { drawSVG: '50% 50%' }, { drawSVG: '0% 100%', duration: 1.4, ease: 'power2.inOut' }, 0.2);
  });
};
export default scene;
