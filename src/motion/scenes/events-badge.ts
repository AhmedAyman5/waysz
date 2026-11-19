/**
 * Events page — registration (views/events/Register.astro). Sticky + scrubbed, not a pin.
 * Its sticky progress drives the act `gala`: the badge drops in on its lanyard (`gala.badge`), a line of light scans
 * its QR code (`gala.scan`), and the seats of the hall light up row by row (`gala.seats` — they stay lit for the rest
 * of the page: the hall is full). `.greg__pad` sends the pointer to the act (`gala.grab`) so the visitor can grab
 * and swing the badge; it takes the pointer only over the badge.
 * css tier (no WebGL): the HTML badge swings from its strap and its scan line runs with the same progress.
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

const scene: Scene = (root, env) => {
  whenNear(root, () => {
    const q = gsap.utils.selector(root);
    ScrollTrigger.create({
      trigger: root, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => {
        const p = self.progress;
        gala.badge = span(p, 0.02, 0.14) * (1 - span(p, 0.92, 1));
        gala.scan = span(p, 0.18, 0.34);
        gala.seats = span(p, 0.3, 0.9);
      },
      onLeaveBack: () => { gala.badge = 0; gala.scan = 0; gala.seats = 0; },
    });

    // the pointer on the badge: host-relative NDC, the same space the act projects the card into
    const pad = root.querySelector<HTMLElement>('.greg__pad');
    const host = document.querySelector<HTMLElement>('.gala__stage');
    if (pad && host && env.tier === 'full') {
      const at = (e: PointerEvent) => {
        const r = host.getBoundingClientRect();
        gala.grab.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        gala.grab.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      };
      pad.addEventListener('pointerdown', (e) => { at(e); gala.grab.down = true; pad.setPointerCapture(e.pointerId); });
      pad.addEventListener('pointermove', (e) => { if (gala.grab.down) at(e); });
      const up = () => { gala.grab.down = false; };
      pad.addEventListener('pointerup', up);
      pad.addEventListener('pointercancel', up);
      pad.addEventListener('lostpointercapture', up);
    }

    // css tier: the HTML badge — a pendulum that settles; its scan line follows the scroll
    if (env.tier === 'css') {
      const dom = root.querySelector('.greg__dom');
      gsap.set(dom, { transformOrigin: '50% 0%' });
      gsap.fromTo(dom, { rotation: 9 * env.dir }, {
        rotation: 0, duration: 3.2, ease: 'elastic.out(1, 0.28)',
        scrollTrigger: { trigger: root, start: 'top 40%', toggleActions: 'play none none reset' },
      });
      gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.4 } })
        .fromTo(q('.greg__scan'), { opacity: 0, y: 0 }, { opacity: 1, duration: 0.02 }, 0.18)
        .to(q('.greg__scan'), { y: () => (root.querySelector<HTMLElement>('.greg__card')?.offsetHeight ?? 200) * 0.26, duration: 0.16 }, 0.18)
        .to(q('.greg__scan'), { opacity: 0, duration: 0.02 }, 0.34)
        .set({}, {}, 1);
    }

    const title = root.querySelector<HTMLElement>('.greg__title')!;
    const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
    gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 55%', once: true } })
      .fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.2, stagger: 0.08 })
      .fromTo(q('.greg__name, .greg__text, .greg__link, .greg__hint'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.3);
  });
};
export default scene;
