import { Color } from 'three';

/** Reads a semantic colour token as a three.js Color (display space, no conversion) — no hex in shaders. */
export function token(name: string, scope: Element, mixWith?: [string, number]) {
  const probe = document.createElement('i');
  probe.style.color = mixWith
    ? `color-mix(in srgb, var(${name}) ${mixWith[1]}%, var(${mixWith[0]}))`
    : `var(${name})`;
  scope.append(probe);
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.fillStyle = getComputedStyle(probe).color;
  ctx.fillRect(0, 0, 1, 1);
  probe.remove();
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return new Color().setRGB(r / 255, g / 255, b / 255);
}
