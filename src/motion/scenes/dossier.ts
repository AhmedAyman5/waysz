/**
 * Immigration page — the eight services as the sheets of a file (views/immigration/Services.astro).
 * Wide screens: CSS sticky holds the screen (not a pin) and one scrubbed ScrollTrigger slides the track
 * sideways (× env.dir). Each sheet lies tilted and low at the edge and settles upright in the middle;
 * its icon draws itself once when it arrives. Small screens: the sheets are a list and enter as they come.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { lenis } from '../smooth-scroll';

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const track = root.querySelector<HTMLElement>('.dossier__track')!;
  const sheets = gsap.utils.toArray<HTMLElement>('.sheet', root);
  const now = root.querySelector<HTMLElement>('.dossier__now')!;
  const bar = root.querySelector<HTMLElement>('.dossier__bar i')!;
  const fmt = new Intl.NumberFormat(env.rtl ? 'ar-EG' : 'en', { minimumIntegerDigits: 2 });

  const title = root.querySelector<HTMLElement>('.dossier__title')!;
  const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.1, stagger: 0.07, scrollTrigger: { trigger: root, start: 'top 60%', once: true } });

  const drawn = new Set<HTMLElement>();
  sheets.forEach((s) => gsap.set(s.querySelectorAll('.sheet__icon > *'), { drawSVG: '0%' }));
  const draw = (s: HTMLElement) => {
    if (drawn.has(s)) return;
    drawn.add(s);
    gsap.to(s.querySelectorAll('.sheet__icon > *'), { drawSVG: '100%', duration: 1.2, stagger: 0.07, ease: 'power2.inOut' });
  };

  gsap.matchMedia().add({ wide: '(min-width: 1024px)', small: '(max-width: 1023px)' }, (ctx) => {
    if (!ctx.conditions!.wide) {
      const triggers = sheets.map((s) => ScrollTrigger.create({ trigger: s, start: 'top 80%', once: true, onEnter: () => draw(s) }));
      gsap.set(sheets, { opacity: 0, y: 40 });
      const batch = ScrollTrigger.batch(sheets, {
        start: 'top 88%', once: true,
        onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }),
      });
      return () => { triggers.forEach((t) => t.kill()); batch.forEach((t) => t.kill()); gsap.set(sheets, { clearProps: 'all' }); };
    }

    root.classList.add('is-scrub');
    let distance = 0, centers: number[] = [];
    const measure = () => {
      gsap.set(track, { x: 0 });
      gsap.set(sheets, { clearProps: 'transform' });
      distance = Math.max(track.scrollWidth - innerWidth, 0);
      root.style.height = `${innerHeight + distance}px`;
      // each sheet's centre, measured along the reading direction from the leading edge of the screen
      centers = sheets.map((s) => {
        const r = s.getBoundingClientRect();
        return env.rtl ? innerWidth - (r.left + r.width / 2) : r.left + r.width / 2;
      });
    };
    const setX = gsap.quickSetter(track, 'x', 'px');
    const update = (p: number) => {
      const shift = p * distance;
      setX(-shift * env.dir);
      let nearest = 0, best = Infinity;
      sheets.forEach((s, i) => {
        const d = (centers[i] - shift - innerWidth / 2) / innerWidth;      // −0.5 … 0.5 across the screen
        const a = Math.min(Math.abs(d) * 1.7, 1);
        gsap.set(s, { rotation: d * 9 * env.dir, y: a * a * 70, scale: 1 - a * 0.07 });
        if (Math.abs(d) < best) { best = Math.abs(d); nearest = i; }
        if (Math.abs(d) < 0.42) draw(s);
      });
      now.textContent = fmt.format(nearest + 1);
      gsap.set(bar, { scaleX: p });
    };
    ScrollTrigger.addEventListener('refreshInit', measure);
    measure();
    const st = ScrollTrigger.create({
      trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.6,
      onUpdate: (self) => update(self.progress), onRefresh: (self) => update(self.progress),
    });
    // keyboard: a focused link brings its sheet to the middle
    const onFocus = (e: FocusEvent) => {
      const i = sheets.indexOf((e.target as Element).closest<HTMLElement>('.sheet')!);
      if (i < 0 || !distance) return;
      const p = gsap.utils.clamp(0, 1, (centers[i] - innerWidth / 2) / distance);
      const y = st.start + p * (st.end - st.start);
      if (Math.abs(y - scrollY) < 40) return;
      if (lenis) lenis.scrollTo(y, { duration: 0.8 }); else window.scrollTo(0, y);
    };
    track.addEventListener('focusin', onFocus);
    return () => {
      ScrollTrigger.removeEventListener('refreshInit', measure);
      track.removeEventListener('focusin', onFocus);
      st.kill();
      root.classList.remove('is-scrub');
      root.style.height = '';
      gsap.set([track, ...sheets], { clearProps: 'transform' });
    };
  });
};
export default scene;
