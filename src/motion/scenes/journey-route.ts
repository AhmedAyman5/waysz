/**
 * Immigration page — the journey (views/immigration/Journey.astro). No pin, no sticky: the route is drawn
 * while the section crosses the screen.
 * Wide: the SVG flight path draws itself, the plane rides it (the SVG is stretched, so the plane is an HTML
 * element placed from the path's own points), each stop lights up and its icon draws once.
 * Small: a vertical line fills and the stops light up one by one.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';

const scene: Scene = (root, env) => {
  if (env.reduce) return;
  const q = gsap.utils.selector(root);
  const stops = gsap.utils.toArray<HTMLElement>('.stop', root);
  const route = root.querySelector<HTMLElement>('.journey__route')!;
  const trail = root.querySelector<SVGPathElement>('.journey__trail')!;
  const plane = root.querySelector<HTMLElement>('.journey__plane')!;
  root.classList.add('is-scrub');

  const title = root.querySelector<HTMLElement>('.journey__title')!;
  const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.1, stagger: 0.05, scrollTrigger: { trigger: title, start: 'top 82%', once: true } });

  // each stop: lights up when the plane arrives; its icon draws once
  const drawn = new Set<HTMLElement>();
  stops.forEach((s) => gsap.set(s.querySelectorAll('.stop__icon > *'), { drawSVG: '0%' }));
  const reach = (count: number) => stops.forEach((s, i) => {
    const on = i < count;
    s.classList.toggle('is-active', on);
    if (on && !drawn.has(s)) {
      drawn.add(s);
      gsap.to(s.querySelectorAll('.stop__icon > *'), { drawSVG: '100%', duration: 1.1, stagger: 0.08, ease: 'power2.inOut' });
      gsap.fromTo(s.querySelector('.stop__node'), { scale: 0.4 }, { scale: 1, duration: 0.7, ease: 'back.out(2.4)' });
    }
  });

  gsap.matchMedia().add({ wide: '(min-width: 1024px)', small: '(max-width: 1023px)' }, (ctx) => {
    if (ctx.conditions!.wide) {
      const length = trail.getTotalLength();
      // where each stop sits along the path (found once by walking it)
      const at = stops.map((s) => {
        const x = (parseFloat(s.style.getPropertyValue('--x')) / 100) * 1200;
        let lo = 0, hi = length;
        for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (trail.getPointAtLength(mid).x < x) lo = mid; else hi = mid; }
        return lo / length;
      });
      const place = (p: number) => {
        const w = route.clientWidth, h = route.clientHeight;
        const a = trail.getPointAtLength(length * p), b = trail.getPointAtLength(Math.min(length, length * p + 6));
        const x = (a.x / 1200) * w, y = (a.y / 480) * h;
        const angle = Math.atan2(((b.y - a.y) / 480) * h, ((b.x - a.x) / 1200) * w) * (180 / Math.PI);
        // RTL: the SVG is mirrored, so the plane's place and heading are mirrored too
        gsap.set(plane, { x: env.rtl ? w - x : x, y, rotation: env.rtl ? 180 - angle : angle });
        gsap.set(trail, { drawSVG: `0% ${p * 100}%` });
        reach(at.filter((t) => p >= t - 0.004).length);
      };
      const st = ScrollTrigger.create({
        trigger: route, start: 'top 78%', end: 'bottom 62%', scrub: 0.7,
        onUpdate: (self) => place(0.02 + self.progress * 0.98),
        onRefresh: (self) => place(0.02 + self.progress * 0.98),
      });
      return () => st.kill();
    }
    const fill = q('.journey__line-fill');
    const st = ScrollTrigger.create({
      trigger: route, start: 'top 70%', end: 'bottom 55%', scrub: 0.6,
      onUpdate: (self) => { gsap.set(fill, { scaleY: self.progress }); reach(Math.floor(self.progress * (stops.length - 0.4) + 0.9)); },
      onRefresh: (self) => { gsap.set(fill, { scaleY: self.progress }); reach(Math.floor(self.progress * (stops.length - 0.4) + 0.9)); },
    });
    return () => st.kill();
  });
};
export default scene;
