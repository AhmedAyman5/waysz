/**
 * Helpers for the decorative code blocks of the Software page (views/software/Code.astro).
 * Code is Latin and always LTR, so splitting it into characters is fine (Arabic text is never split this way).
 */
import type { CodeLayout } from './stage/bridge';

const TONE: Record<string, number> = { key: 1, num: 1, str: 2, com: 3, pun: 3 };

/** Wraps every character of the code in <span class="c">. Returns them in reading order. */
export function splitChars(root: Element): HTMLElement[] {
  const out: HTMLElement[] = [];
  const leaves = root.querySelectorAll<HTMLElement>('.t:not(.t-ws):not(.sw), .sw > .bad, .sw > .good');
  leaves.forEach((leaf) => {
    if (leaf.querySelector('.c')) { out.push(...leaf.querySelectorAll<HTMLElement>('.c')); return; }
    const text = leaf.textContent ?? '';
    leaf.textContent = '';
    for (const ch of text) {
      const c = document.createElement('span');
      c.className = 'c';
      c.textContent = ch;
      leaf.append(c);
      out.push(c);
    }
  });
  return out;
}

/**
 * Where every character sits, in CSS pixels inside `frame` (the element the stage host fills).
 * Uses offsets, not client rects, so transforms on the lines or characters do not disturb it.
 */
export function measureCode(box: HTMLElement, frame: HTMLElement): CodeLayout | null {
  const pre = box.querySelector<HTMLElement>('.code');
  if (!pre || !pre.offsetWidth) return null;
  const style = getComputedStyle(pre);
  const fontPx = parseFloat(style.fontSize);
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = `${style.fontWeight} ${fontPx}px ${style.fontFamily}`;
  const cellW = ctx.measureText('M'.repeat(20)).width / 20;

  // origin of the <pre> inside the frame
  let ox = 0, oy = 0;
  for (let el: HTMLElement | null = pre; el && el !== frame; el = el.offsetParent as HTMLElement | null) { ox += el.offsetLeft; oy += el.offsetTop; }

  const glyphs: CodeLayout['glyphs'] = [];
  let lineH = fontPx * 1.7;
  pre.querySelectorAll<HTMLElement>('.ln').forEach((ln) => {
    if (ln.offsetHeight) lineH = ln.offsetHeight;
    ln.querySelectorAll<HTMLElement>('.t:not(.t-ws)').forEach((t) => {
      const text = (t.querySelector('.good') ?? t).textContent ?? '';
      const kind = /t-(\w+)/.exec(t.className)?.[1] ?? 'id';
      const col = Number(t.dataset.col);
      [...text].forEach((ch, i) => {
        if (ch !== ' ') glyphs.push({ ch, x: ox + ln.offsetLeft + (col + i) * cellW, y: oy + ln.offsetTop, tone: TONE[kind] ?? 0 });
      });
    });
  });
  return { glyphs, cellW, lineH, fontPx, family: style.fontFamily, weight: style.fontWeight };
}
