/**
 * Services page — the directory (views/services/Directory.astro).
 *   Tabs: the links become an ARIA tab list (roving tabindex, ← → / Home / End, automatic activation; arrows follow
 *   the reading direction). Choosing a tab filters the areas with GSAP Flip — the cards travel from where they were on
 *   screen to their new place, the others fade — and keeps ?area= in the URL (history.replaceState). ?area=… on
 *   arrival (the header's «خدماتنا» submenu) opens that tab.
 *   The beam: under «الكل» it follows the area you are reading (scroll spy) and takes its colour; under an area tab it
 *   stays on that tab. It is moved between tabs with Flip, so it slides the right way in both directions.
 *   Cards ↔ sky: a card under the pointer / keyboard focus lights its star (`sky.hot`); clicking a star in the sky
 *   (`sky:pick` from services-sky.ts) brings its card and focuses its link.
 *   Legal's sub-specialties light up one after another each time they come into view.
 * The no-JS page is complete: the tabs are anchors, every area is shown.
 */
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Scene } from '../index';
import { lenis } from '../smooth-scroll';
import { sky } from '../stage/bridge';

type Key = 'all' | 'legal' | 'travel' | 'events' | 'software';

const scene: Scene = (root, env) => {
  const list = root.querySelector<HTMLElement>('.tabs__list')!;
  const tabs = gsap.utils.toArray<HTMLAnchorElement>('.tab', root);
  const beam = root.querySelector<HTMLElement>('.tabs__beam')!;
  const bar = root.querySelector<HTMLElement>('.dir__bar')!;
  const panel = root.querySelector<HTMLElement>('.dir__panel')!;
  const areas = gsap.utils.toArray<HTMLElement>('.area', root);
  const cards = gsap.utils.toArray<HTMLElement>('.svc', root);
  const keyOf = (el: HTMLElement) => (el.dataset.area ?? 'all') as Key;
  const tabOf = (k: Key) => tabs.find((t) => keyOf(t) === k)!;

  // ---------- links → ARIA tabs ----------
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-label', root.querySelector('.tabs')!.getAttribute('aria-label') ?? '');
  list.querySelectorAll('li').forEach((li) => li.setAttribute('role', 'presentation'));
  tabs.forEach((t) => {
    t.setAttribute('role', 'tab');
    t.id = `tab-${keyOf(t)}`;
    t.setAttribute('aria-controls', panel.id);
  });
  panel.setAttribute('role', 'tabpanel');

  let current: Key = 'all';
  let here: Key = 'all';

  const place = (k: Key, animate: boolean) => {
    const tab = tabOf(k);
    bar.dataset.here = k;
    if (beam.parentElement === tab) return;
    const state = Flip.getState(beam);
    tab.append(beam);
    if (animate) Flip.from(state, { duration: 0.7, ease: 'power3.inOut' });
    // keep the marked tab in view on narrow screens (horizontal only: the bar is already on screen)
    const lr = list.getBoundingClientRect(), tr = tab.getBoundingClientRect();
    if (tr.left < lr.left || tr.right > lr.right) list.scrollBy({ left: tr.left + tr.width / 2 - (lr.left + lr.width / 2), behavior: animate ? 'smooth' : 'auto' });
  };
  const setHere = (k: Key) => {
    if (k === here) return;
    here = k;
    if (current === 'all') place(k, true);
  };

  const mark = () => {
    tabs.forEach((t) => {
      const on = keyOf(t) === current;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', `tab-${current}`);
  };

  const dirTop = () => root.getBoundingClientRect().top + window.scrollY;
  const toTop = () => {
    if (window.scrollY > dirTop() + 1) lenis ? lenis.scrollTo(dirTop(), { immediate: true, force: true }) : window.scrollTo(0, dirTop());
  };
  const shows = (a: HTMLElement, k: Key) => k === 'all' || keyOf(a) === k;
  let busy: gsap.core.Timeline | null = null;

  /**
   * Two steps, so nothing ever overlaps: (1) the areas that leave fade out where they are; (2) the layout changes, the
   * page goes back to the top of the directory, the cards that stay fly with Flip from where they were on screen to
   * their new place, and the areas that arrive rise in. The sections below the directory move only while off screen.
   */
  const select = (k: Key, animate: boolean) => {
    if (k === current) { place(k === 'all' ? here : k, animate); return; }
    busy?.progress(1);
    const leaving = areas.filter((a) => !a.hidden && !shows(a, k));
    const staying = areas.filter((a) => !a.hidden && shows(a, k));
    const arriving = areas.filter((a) => a.hidden && shows(a, k));
    current = k;
    mark();
    place(k === 'all' ? here : k, animate);
    const url = new URL(location.href);
    if (k === 'all') url.searchParams.delete('area'); else url.searchParams.set('area', k);
    url.hash = '';
    history.replaceState(history.state, '', url);

    const swap = () => {
      const state = animate ? Flip.getState(staying.flatMap((a) => cards.filter((c) => a.contains(c)))) : null;
      areas.forEach((a) => { a.hidden = !shows(a, k); });
      if (leaving.length) gsap.set(leaving, { clearProps: 'opacity' });
      toTop();
      ScrollTrigger.refresh();
      window.dispatchEvent(new CustomEvent('services:tab', { detail: k }));
      if (!state) return;
      Flip.from(state, { duration: 0.9, ease: 'power3.inOut', stagger: 0.02 });
      const rise = arriving.flatMap((a) => [a.querySelector('.area__text'), ...cards.filter((c) => a.contains(c))]);
      if (rise.length) gsap.fromTo(rise, { opacity: 0, y: 56 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.035, ease: 'expo.out', clearProps: 'opacity,transform' });
    };
    if (!animate || !leaving.length) { swap(); return; }
    busy = gsap.timeline({ onComplete: () => { busy = null; } })
      .to(leaving, { opacity: 0, duration: 0.3, ease: 'power2.in' })
      .call(swap);
  };

  tabs.forEach((t) => t.addEventListener('click', (e) => { e.preventDefault(); select(keyOf(t), true); }));
  list.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement as HTMLAnchorElement);
    if (i < 0) return;
    const step = { ArrowRight: env.dir, ArrowLeft: -env.dir } as Record<string, number>;
    let next = -1;
    if (e.key in step) next = (i + step[e.key] + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    tabs[next].focus();
    select(keyOf(tabs[next]), true);
  });

  // ---------- arrival: ?area=… (the header submenu) ----------
  mark();
  const asked = new URLSearchParams(location.search).get('area') as Key | null;
  if (asked && asked !== 'all' && tabs.some((t) => keyOf(t) === asked)) {
    select(asked, false);
    requestAnimationFrame(() => (lenis ? lenis.scrollTo(dirTop(), { immediate: true, force: true }) : window.scrollTo(0, dirTop())));
  }

  // ---------- scroll spy (under «الكل»): the area under the middle of the screen ----------
  areas.forEach((a) => ScrollTrigger.create({
    trigger: a, start: 'top 50%', end: 'bottom 50%',
    onToggle: (self) => { if (self.isActive) setHere(keyOf(a)); else if (here === keyOf(a)) setHere('all'); },
  }));

  // ---------- cards ↔ stars ----------
  const starOf = (el: HTMLElement) => Number(el.dataset.star);
  cards.forEach((c) => {
    const on = () => { sky.hot = starOf(c); };
    const off = () => { if (sky.hot === starOf(c)) sky.hot = -1; };
    c.addEventListener('pointerenter', on);
    c.addEventListener('pointerleave', off);
    c.addEventListener('focusin', on);
    c.addEventListener('focusout', off);
  });
  let lit: HTMLElement | undefined;
  window.addEventListener('sky:hover', (e) => {
    lit?.classList.remove('is-lit');
    lit = cards.find((c) => starOf(c) === (e as CustomEvent<number>).detail);
    lit?.classList.add('is-lit');
  });
  window.addEventListener('sky:pick', (e) => {
    const card = cards.find((c) => starOf(c) === (e as CustomEvent<number>).detail);
    if (!card) return;
    if (card.closest('[hidden]')) select(keyOf(card), false);
    const link = card.querySelector<HTMLElement>('.svc__more');
    const done = () => {
      link?.focus({ preventScroll: true });
      card.classList.remove('is-picked');
      void card.offsetWidth;
      card.classList.add('is-picked');
    };
    const offset = -(bar.offsetHeight + 120);
    if (lenis) lenis.scrollTo(card, { offset, duration: 1.2, onComplete: done });
    else { window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY + offset, behavior: 'smooth' }); done(); }
  });

  // ---------- Legal: the sub-specialties light up in sequence ----------
  const chips = gsap.utils.toArray<HTMLElement>('.chip', root);
  if (chips.length) {
    const tl = gsap.timeline({ paused: true })
      .to(chips, { '--lit': 1, duration: 0.4, stagger: 0.12, ease: 'power2.out' })
      .to(chips, { '--lit': 0.3, duration: 1.4, stagger: 0.12, ease: 'power2.inOut' }, 0.5);
    ScrollTrigger.create({ trigger: chips[0].parentElement, start: 'top 85%', onEnter: () => tl.restart(), onEnterBack: () => tl.restart() });
  }
};
export default scene;
