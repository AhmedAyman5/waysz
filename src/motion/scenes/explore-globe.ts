/**
 * Immigration page — "Explore the world" (views/immigration/Explore.astro).
 * This scene owns everything the visitor touches and reads: the combobox (keyboard + screen readers), the
 * pointer on the globe (drag = rotate with inertia, hover = name, click / tap = select; on touch a vertical
 * drag still scrolls the page — `touch-action: pan-y`), zoom buttons, and the welcome message in the DOM.
 * The globe itself is drawn by the shared WebGL stage (acts/explore.ts) and driven through ExploreControls.
 * css tier / reduced motion / WebGL failure: the same list and message over a still globe, no flight.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Scene } from '../index';
import { lenis } from '../smooth-scroll';
import { addAct } from '../stage';
import type { ExploreControls } from '../stage/bridge';

/** search key: lower case, no Arabic marks, one form per letter family */
const fold = (s: string) => s.toLowerCase().normalize('NFKD')
  .replace(/[ً-ٰٟـ̀-ͯ]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const scene: Scene = (root, env) => {
  const input = root.querySelector<HTMLInputElement>('.combo__input')!;
  const list = root.querySelector<HTMLElement>('.combo__list')!;
  const emptyRow = root.querySelector<HTMLElement>('.combo__empty')!;
  const options = gsap.utils.toArray<HTMLElement>('.combo__option', root);
  const card = root.querySelector<HTMLElement>('.explore__card')!;
  const country = root.querySelector<HTMLElement>('.explore__country')!;
  const ask = root.querySelector<HTMLAnchorElement>('.explore__ask')!;
  const pad = root.querySelector<HTMLElement>('.explore__pad')!;
  const tip = root.querySelector<HTMLElement>('.explore__tip')!;
  const host = root.querySelector<HTMLElement>('.explore__stage')!;
  const q = gsap.utils.selector(root);

  const items = options.map((el) => ({ el, id: el.dataset.id!, name: el.textContent!.trim(), key: fold(`${el.textContent} ${el.dataset.alt}`) }));
  const byId = new Map(items.map((it) => [it.id, it]));
  let controls: ExploreControls | null = null;
  let selected: string | null = null;

  // ---------- the message ----------
  let split: SplitText | null = null;
  const showMessage = (id: string) => {
    const it = byId.get(id);
    if (!it || selected !== id) return;
    split?.revert();
    country.textContent = it.name;
    country.classList.toggle('is-long', it.name.length > 14);
    ask.textContent = root.dataset.ask!.replace('{country}', it.name);
    card.hidden = false;
    // the consultation call further down the page knows the destination
    document.querySelectorAll<HTMLElement>('[data-destination-chip]').forEach((chip) => {
      chip.textContent = chip.dataset.destinationChip!.replace('{country}', it.name);
      chip.hidden = false;
    });
    document.querySelectorAll<HTMLAnchorElement>('a[data-consult]').forEach((a) => {
      const url = new URL(a.href);
      url.searchParams.set('destination', id);
      a.href = url.toString();
    });
    if (!env.reduce) {
      split = SplitText.create(country, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' });   // never chars (Arabic)
      gsap.timeline()
        .fromTo(q('.explore__hello'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7 })
        .fromTo(split.words, { yPercent: 118 }, { yPercent: 0, duration: 1.2, stagger: 0.09 }, 0.08)
        .fromTo(q('.explore__actions'), { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.8 }, 0.45);
    }
    // small screens: the message sits under the globe — bring it into view if it is cut off
    const r = card.getBoundingClientRect();
    if (r.bottom > innerHeight - 12) {
      const y = scrollY + r.bottom - innerHeight + 28;
      if (lenis) lenis.scrollTo(y, { duration: 1 }); else window.scrollTo({ top: y });
    }
  };

  const select = (id: string) => {
    const it = byId.get(id);
    if (!it) return;
    selected = id;
    input.value = it.name;
    options.forEach((o) => o.setAttribute('aria-selected', String(o === it.el)));
    close();
    root.classList.add('has-touched');
    if (controls) {
      if (!card.hidden) gsap.to(card, { opacity: 0, duration: 0.25, onComplete: () => { card.hidden = true; gsap.set(card, { opacity: 1 }); } });
      controls.flyTo(id, () => { gsap.killTweensOf(card); gsap.set(card, { opacity: 1 }); showMessage(id); });
    } else showMessage(id);
  };

  // ---------- combobox (ARIA 1.2: input + listbox, the focus stays in the input) ----------
  let active = -1;
  let shown: typeof items = items;
  const setActive = (i: number) => {
    shown[active]?.el.classList.remove('is-active');
    active = i;
    const el = shown[i]?.el;
    if (el) {
      el.classList.add('is-active');
      el.scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', el.id);
    } else input.removeAttribute('aria-activedescendant');
  };
  const open = () => { list.hidden = false; input.setAttribute('aria-expanded', 'true'); };
  function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); setActive(-1); }
  const filter = () => {
    const key = fold(input.value);
    setActive(-1);
    shown = items.filter((it) => {
      const ok = !key || it.key.includes(key);
      it.el.hidden = !ok;
      return ok;
    });
    emptyRow.hidden = shown.length > 0;
    open();
    if (key && shown.length) setActive(0);
  };
  input.addEventListener('input', filter);
  input.addEventListener('focus', () => { input.select(); shown = items; items.forEach((it) => { it.el.hidden = false; }); emptyRow.hidden = true; open(); });
  input.addEventListener('blur', () => window.setTimeout(close, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.hidden) { open(); return; }
      if (!shown.length) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((active + step + shown.length) % shown.length);
    } else if (e.key === 'Enter') {
      if (!list.hidden && shown[active]) { e.preventDefault(); select(shown[active].id); }
    } else if (e.key === 'Escape') {
      if (!list.hidden) { e.preventDefault(); close(); }
    }
  });
  list.addEventListener('pointerdown', (e) => e.preventDefault());           // keep the focus in the input
  list.addEventListener('click', (e) => {
    const el = (e.target as Element).closest<HTMLElement>('.combo__option');
    if (el) select(el.dataset.id!);
  });

  if (env.reduce || env.tier === 'css') return;                             // the still globe + list + message

  // ---------- the live globe ----------
  const local = (e: PointerEvent | WheelEvent) => {
    const r = host.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  let down: { id: number; x: number; y: number; t: number } | null = null;
  let dragging = false, lastX = 0, lastY = 0, lastT = 0, vx = 0, vy = 0, hoverAt = 0;
  let idle = 0;
  const rest = () => {
    window.clearTimeout(idle);
    idle = window.setTimeout(() => { if (!selected && !down) controls?.setAuto(true); }, 4500);
  };
  const setTip = (id: string | null, x = 0, y = 0) => {
    const it = id ? byId.get(id) : null;
    tip.classList.toggle('is-on', !!it);
    if (it) {
      if (tip.textContent !== it.name) tip.textContent = it.name;
      gsap.set(tip, { x: x + 18, y: y - 44 });
    }
  };

  pad.addEventListener('pointerdown', (e) => {
    if (!controls || (e.pointerType === 'mouse' && e.button !== 0)) return;
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    dragging = false;
    lastX = e.clientX; lastY = e.clientY; lastT = down.t; vx = vy = 0;
    controls.setAuto(false);
    window.clearTimeout(idle);
  });
  pad.addEventListener('pointermove', (e) => {
    if (!controls) return;
    if (down && e.pointerId === down.id) {
      if (!dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
        dragging = true;
        pad.classList.add('is-dragging');
        root.classList.add('has-touched');
        pad.setPointerCapture(e.pointerId);
        controls.hover(null); setTip(null);
      }
      if (dragging) {
        const now = performance.now(), dt = Math.max(now - lastT, 1);
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        controls.drag(dx, dy);
        vx = vx * 0.6 + (dx / dt) * 400; vy = vy * 0.6 + (dy / dt) * 400;   // smoothed px/s
        lastX = e.clientX; lastY = e.clientY; lastT = now;
      }
    } else if (e.pointerType === 'mouse') {
      controls.setAuto(false);                                              // a country must not slide away from under the pointer
      window.clearTimeout(idle);
      const now = performance.now();
      if (now - hoverAt < 32) return;                                       // picking at most ~30×/s
      hoverAt = now;
      const [x, y] = local(e);
      const id = controls.pick(x, y);
      controls.hover(id);
      const r = pad.getBoundingClientRect();
      setTip(id, e.clientX - r.left, e.clientY - r.top);
      pad.style.cursor = id ? 'pointer' : '';
    }
  });
  const up = (e: PointerEvent) => {
    if (!controls || !down || e.pointerId !== down.id) return;
    const tap = !dragging && e.type === 'pointerup' && performance.now() - down.t < 600;
    if (dragging) controls.release(performance.now() - lastT < 80 ? vx : 0, performance.now() - lastT < 80 ? vy : 0);
    down = null; dragging = false;
    pad.classList.remove('is-dragging');
    if (tap) {
      const [x, y] = local(e);
      const id = controls.pick(x, y);
      if (id) { setTip(null); select(id); }
    }
    rest();
  };
  pad.addEventListener('pointerup', up);
  pad.addEventListener('pointercancel', up);                                // the browser took the gesture (vertical scroll)
  pad.addEventListener('pointerleave', () => { if (!down) { controls?.hover(null); setTip(null); rest(); } });
  // zoom: the buttons, or pinch on a trackpad (ctrl + wheel). A plain wheel always scrolls the page.
  pad.addEventListener('wheel', (e) => {
    if (!controls || !e.ctrlKey) return;
    e.preventDefault(); e.stopPropagation();
    controls.zoom(Math.exp(-e.deltaY * 0.01));
  }, { passive: false });
  root.querySelectorAll<HTMLButtonElement>('.explore__zoom button').forEach((b) => {
    b.addEventListener('click', () => { controls?.zoom(Number(b.dataset.zoom)); controls?.setAuto(false); rest(); });
  });

  const media = matchMedia('(min-width: 1024px)');
  const layout = () => controls?.setLayout(env.dir, !media.matches);
  media.addEventListener('change', layout);

  // load the borders + the act when the section is near (their own chunks; nothing before that)
  ScrollTrigger.create({
    trigger: root, start: 'top 250%', once: true,
    onEnter: () => {
      if (env.tier === 'css') return;
      void addAct(env, async () => {
        // one step per frame (parse three, decode the borders, build the globe): no long frame while scrolling
        const breathe = () => new Promise<void>((done) => { window.setTimeout(done, 0); });
        const { loadBorders } = await import('../../lib/borders');
        const borders = await loadBorders();
        await breathe();
        const { createExploreAct } = await import('../stage/acts/explore');
        await breathe();
        const act = createExploreAct(host, env.tier === 'high' ? 'high' : 'lite', borders, (id) => byId.has(id));
        controls = act.controls;
        layout();
        root.classList.add('is-live');
        return act;
      });
    },
  });
  // the stage can give up later (slow frames, lost context): back to the still globe, the list still works
  new MutationObserver(() => {
    if (document.documentElement.dataset.tier !== 'css') return;
    controls = null;
    root.classList.remove('is-live');
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tier'] });

  // title: words rise once
  const title = root.querySelector<HTMLElement>('.explore__title')!;
  const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', aria: 'auto' }).words;
  gsap.fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 1.1, stagger: 0.08, scrollTrigger: { trigger: root, start: 'top 55%', once: true } });
};
export default scene;
