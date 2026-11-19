/**
 * Act "sky" — Services page, "The sky of services". Navigators found their way by the stars; WaysZ = ways.
 * Every service is a star and every area a constellation whose lines draw its emblem:
 *   0 legal — a pair of scales · 1 travel — a plane on its (dashed) route · 2 events — a stage in a spotlight ·
 *   3 software — </>.  Minor stars (dimmer, not services) complete the drawings, like in a real constellation.
 * The camera flies to the constellation the page asks for (`sky.focus`) and frames it inside a box of the DOM
 * (`sky.box`), so it always sits in the free part of the layout; -1 frames the whole sky. Its lines draw star to
 * star whenever it is chosen, the other three dim. A card under the pointer / focus lights its star and sends a
 * pulse along the lines to it; the star under the pointer is reported back (`sky.onHover`).
 * The finale (`sky.unite`, «جهة واحدة تنسّق كل شيء») draws four arcs from the constellations to one centre star
 * with a ring: four ways, one WaysZ.
 * One renderer, no depth buffer: backdrop → field stars → lines → stars, all additive. Full scene on every device.
 */
import { gsap } from 'gsap';
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, InstancedBufferAttribute, InstancedBufferGeometry, Mesh,
  PerspectiveCamera, PlaneGeometry, Points, Scene, ShaderMaterial, Vector2, Vector3,
} from 'three';
import type { Act } from '../stage';
import { sky, UNITE } from '../bridge';
import {
  backdropFragment, backdropVertex, fieldFragment, fieldVertex, lineFragment, lineVertex, starFragment, starVertex,
} from '../shaders/sky.glsl';
import { token } from './util';

const FOV = 40;
const FIELD = 2600;                 // point stars in depth, on every device (quality policy)
const REF = 9;                      // camera distance at which stars have their nominal size
const ARC_SEGMENTS = 22;
const RING_SEGMENTS = 56;
const RING = 0.62;                  // radius of the finale ring around the centre star (world)

/** small seeded generator: the same sky on every visit (and in the stills) */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---------- the four emblems (local units, about -1…1, y up). s = service number inside the area ----------
type P = { x: number; y: number; s?: number };
type E = [number, number, 1?];      // two point indices, 1 = dashed
interface Emblem { pts: P[]; edges: E[] }

const plane = (() => {
  const c = { x: 0.5, y: 0.42 }, a = (38 * Math.PI) / 180;
  const d = { x: Math.cos(a), y: Math.sin(a) }, n = { x: -d.y, y: d.x };
  const at = (u: number, v: number) => ({ x: c.x + d.x * u + n.x * v, y: c.y + d.y * u + n.y * v });
  return { nose: at(0.44, 0), root: at(0.06, 0), wingL: at(-0.14, 0.5), wingR: at(-0.14, -0.5), tail: at(-0.36, 0), finL: at(-0.44, 0.18), finR: at(-0.44, -0.18) };
})();

const EMBLEMS: Emblem[] = [
  { // legal — the scales
    pts: [
      { x: 0, y: 0.98 }, { x: 0, y: 0.64, s: 0 }, { x: -0.8, y: 0.5, s: 1 }, { x: 0.8, y: 0.58, s: 2 },
      { x: -1.04, y: -0.12 }, { x: -0.56, y: -0.12 }, { x: -0.8, y: -0.26, s: 3 },
      { x: 0.56, y: -0.04 }, { x: 1.04, y: -0.04 }, { x: 0.8, y: -0.18, s: 4 },
      { x: 0, y: -0.78, s: 5 }, { x: -0.38, y: -0.92 }, { x: 0.38, y: -0.92 },
    ],
    edges: [[0, 1], [1, 2], [1, 3], [2, 4], [2, 5], [4, 6], [6, 5], [3, 7], [3, 8], [7, 9], [9, 8], [1, 10], [11, 10], [10, 12]],
  },
  { // travel — a plane on its route
    pts: [
      { x: -1.02, y: -0.82, s: 0 }, { x: -0.62, y: -0.6, s: 1 }, { x: -0.26, y: -0.32, s: 2 }, { x: 0.04, y: 0.0, s: 3 },
      { ...plane.tail, s: 4 }, { ...plane.root }, { ...plane.nose, s: 5 }, { ...plane.wingL, s: 6 }, { ...plane.wingR, s: 7 },
      { ...plane.finL }, { ...plane.finR },
    ],
    edges: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5], [5, 6], [7, 5], [5, 8], [9, 4], [4, 10]],
  },
  { // events — a stage in a spotlight, curtains at the sides
    pts: [
      { x: 0, y: 1.0, s: 0 }, { x: -0.44, y: -0.36, s: 1 }, { x: 0, y: -0.5, s: 2 }, { x: 0.44, y: -0.36, s: 3 }, { x: 0, y: -0.24 },
      { x: -0.86, y: -0.3, s: 4 }, { x: 0.86, y: -0.3, s: 5 }, { x: -1.06, y: -0.66, s: 6 }, { x: 1.06, y: -0.66, s: 7 },
      { x: -1.0, y: 0.84, s: 8 }, { x: 1.0, y: 0.84, s: 9 },
    ],
    edges: [[0, 1], [0, 3], [1, 2], [2, 3], [3, 4], [4, 1], [5, 6], [6, 8], [8, 7], [7, 5], [9, 10], [9, 5], [10, 6]],
  },
  { // software — </>
    pts: [
      { x: -0.56, y: 0.52, s: 0 }, { x: -1.02, y: 0, s: 1 }, { x: -0.56, y: -0.52 },
      { x: 0.24, y: 0.78, s: 2 }, { x: -0.24, y: -0.78 },
      { x: 0.56, y: 0.52, s: 3 }, { x: 1.02, y: 0, s: 4 }, { x: 0.56, y: -0.52, s: 5 },
    ],
    edges: [[0, 1], [1, 2], [3, 4], [5, 6], [6, 7]],
  },
];
const FIRST = [0, 6, 14, 24];       // number of the first star of each area (order of src/data/services.ts)

// where the constellations stand: wide screens in two rows, portrait screens in a zig-zag column
const LAYOUT = {
  wide: { scale: 1, at: [[-3.05, 1.2], [3.05, 1.3], [-2.85, -1.35], [3.0, -1.25]], half: [4.3, 2.55] },
  compact: { scale: 0.92, at: [[-0.88, 3.3], [0.98, 1.18], [-0.98, -1.18], [0.88, -3.3]], half: [2.05, 4.45] },
};
const R = 1.28;                     // framing radius of one constellation (world, × scale)

export function createSkyAct(host: HTMLElement): Act {
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 200);
  camera.position.set(0, 0, 14);
  const tan = Math.tan((FOV * Math.PI) / 360);

  const area = (i: number) => token(['--color-area-legal', '--color-area-travel', '--color-area-events', '--color-area-software'][i], host);
  const colors = [area(0), area(1), area(2), area(3), token('--color-accent', host)];
  const pr = { value: 1 };
  const res = { value: new Vector2(1, 1) };                     // drawing buffer, device px

  // ---------- backdrop ----------
  const back = {
    uRes: res,
    uPan: { value: new Vector2(0, 0) },
    uTime: { value: 0 }, uNight: { value: 0 }, uGrain: { value: 1 }, uBlack: { value: 0 }, uStars: { value: 1 },
    uTop: { value: token('--color-bg', host, ['--color-ink', 98]) },
    uLow: { value: token('--color-bg-alt', host) },
    uGlow: { value: token('--color-accent', host) },
    uDust: { value: token('--color-ink', host, ['--color-focus', 72]) },
    uAuroraA: { value: token('--color-area-software', host) },
    uAuroraB: { value: token('--color-focus', host, ['--color-area-software', 40]) },
  };
  const backMat = new ShaderMaterial({ uniforms: back, vertexShader: backdropVertex, fragmentShader: backdropFragment, depthTest: false, depthWrite: false });
  const backMesh = new Mesh(new PlaneGeometry(2, 2), backMat);
  backMesh.frustumCulled = false;
  backMesh.renderOrder = 0;
  scene.add(backMesh);

  // ---------- field stars in depth ----------
  const rand = seeded(29);
  const fieldPos = new Float32Array(FIELD * 3), fieldMeta = new Float32Array(FIELD * 4);
  for (let i = 0; i < FIELD; i++) {
    const z = -6 - Math.pow(rand(), 0.7) * 74;
    const spread = (14 - z) * tan * 1.9;
    fieldPos.set([(rand() - 0.5) * spread * 2.2, (rand() - 0.5) * spread * 1.6, z], i * 3);
    const big = rand();
    fieldMeta.set([1.1 + Math.pow(big, 6) * 2.6, 0.35 + rand() * 0.65, rand(), rand()], i * 4);
  }
  const fieldGeo = new BufferGeometry();
  fieldGeo.setAttribute('position', new BufferAttribute(fieldPos, 3));
  fieldGeo.setAttribute('aMeta', new BufferAttribute(fieldMeta, 4));
  const field = {
    uTime: { value: 0 }, uPx: pr, uFade: { value: 1 },
    uWarm: { value: token('--color-ink', host, ['--color-accent', 82]) },
    uCool: { value: token('--color-ink', host, ['--color-focus', 78]) },
  };
  const fieldMat = new ShaderMaterial({ uniforms: field, vertexShader: fieldVertex, fragmentShader: fieldFragment, transparent: true, blending: AdditiveBlending, depthTest: false, depthWrite: false });
  const fieldPts = new Points(fieldGeo, fieldMat);
  fieldPts.frustumCulled = false;
  fieldPts.renderOrder = 1;
  scene.add(fieldPts);

  // ---------- constellation stars + lines (rebuilt when the layout changes) ----------
  const starCount = EMBLEMS.reduce((n, e) => n + e.pts.length, 0) + 1;      // + the centre star of the finale
  const lineCount = EMBLEMS.reduce((n, e) => n + e.edges.length, 0) + 4 * ARC_SEGMENTS + RING_SEGMENTS;
  const sFrom = new Float32Array(starCount * 3), sTo = new Float32Array(starCount * 3), sMeta = new Float32Array(starCount * 4);
  const lA = new Float32Array(lineCount * 3), lB = new Float32Array(lineCount * 3), lSeg = new Float32Array(lineCount * 4);
  const lCol = new Float32Array(lineCount * 3), lStars = new Float32Array(lineCount * 2);
  const svcPos: Vector3[] = Array.from({ length: 30 }, () => new Vector3());   // assembled place of each service star
  const svcGroup = new Int8Array(30);

  const quad = new PlaneGeometry(2, 2);
  const starGeo = new InstancedBufferGeometry();
  starGeo.index = quad.index;
  starGeo.setAttribute('position', quad.getAttribute('position'));
  const starAttrs = { aFrom: new InstancedBufferAttribute(sFrom, 3), aTo: new InstancedBufferAttribute(sTo, 3), aMeta: new InstancedBufferAttribute(sMeta, 4) };
  Object.entries(starAttrs).forEach(([k, a]) => starGeo.setAttribute(k, a));
  starGeo.instanceCount = starCount;

  const strip = new PlaneGeometry(1, 2);
  strip.translate(0.5, 0, 0);                                    // x: 0…1 along the line, y: -1…1 across
  const lineGeo = new InstancedBufferGeometry();
  lineGeo.index = strip.index;
  lineGeo.setAttribute('position', strip.getAttribute('position'));
  const lineAttrs = {
    aA: new InstancedBufferAttribute(lA, 3), aB: new InstancedBufferAttribute(lB, 3), aSeg: new InstancedBufferAttribute(lSeg, 4),
    aColor: new InstancedBufferAttribute(lCol, 3), aStars: new InstancedBufferAttribute(lStars, 2),
  };
  Object.entries(lineAttrs).forEach(([k, a]) => lineGeo.setAttribute(k, a));
  lineGeo.instanceCount = lineCount;

  const lit = [0, 0, 0, 0, 1], draw = [0, 0, 0, 0, 0];
  const common = { uRes: res, uPx: pr, uTime: { value: 0 }, uHot: { value: -1 } };
  const lineU = { ...common, uDraw: { value: draw }, uLit: { value: lit }, uWidth: { value: 1.05 } };
  const starU = {
    ...common, uAssemble: { value: 0 }, uRef: { value: REF }, uHover: { value: -1 }, uCentre: { value: 0 },
    uLit: { value: lit }, uColor: { value: colors },
  };
  const lineMat = new ShaderMaterial({ uniforms: lineU, vertexShader: lineVertex, fragmentShader: lineFragment, transparent: true, blending: AdditiveBlending, depthTest: false, depthWrite: false });
  const starMat = new ShaderMaterial({ uniforms: starU, vertexShader: starVertex, fragmentShader: starFragment, transparent: true, blending: AdditiveBlending, depthTest: false, depthWrite: false });
  const lines = new Mesh(lineGeo, lineMat);
  const stars = new Mesh(starGeo, starMat);
  lines.frustumCulled = stars.frustumCulled = false;
  lines.renderOrder = 2;
  stars.renderOrder = 3;
  scene.add(lines, stars);

  let layout: typeof LAYOUT.wide | null = null;
  const centreOf = (g: number) => ({ x: layout!.at[g][0], y: layout!.at[g][1] });

  const build = (compact: boolean) => {
    layout = compact ? LAYOUT.compact : LAYOUT.wide;
    const { scale, half } = layout;
    const r = seeded(11);
    let si = 0, li = 0;
    const tint = (c: Color, k: number) => c.clone().lerp(new Color(1, 1, 1), k);
    EMBLEMS.forEach((em, g) => {
      const c = centreOf(g);
      const first = si;
      em.pts.forEach((p, k) => {
        const to = [c.x + p.x * scale, c.y + p.y * scale, 0];
        // scattered: anywhere in the whole sky, a little in depth
        const from = [(r() - 0.5) * half[0] * 2.3, (r() - 0.5) * half[1] * 2.3, -2.5 + r() * 3];
        sFrom.set(from, si * 3);
        sTo.set(to, si * 3);
        const svc = p.s === undefined ? -1 : FIRST[g] + p.s;
        sMeta.set([g, svc, svc >= 0 ? 62 : 34, (k / em.pts.length) * 0.7 + r() * 0.3], si * 4);
        if (svc >= 0) { svcPos[svc].set(to[0], to[1], to[2]); svcGroup[svc] = g; }
        si++;
      });
      const n = em.edges.length;
      const col = tint(colors[g], 0.25);
      em.edges.forEach(([a, b, dash], k) => {
        lA.set(sTo.subarray((first + a) * 3, (first + a) * 3 + 3), li * 3);
        lB.set(sTo.subarray((first + b) * 3, (first + b) * 3 + 3), li * 3);
        const t0 = (k / n) * 0.82;
        lSeg.set([g, t0, Math.min(t0 + 1.25 / n, 1), dash ? 1 : 0], li * 4);
        lCol.set([col.r, col.g, col.b], li * 3);
        lStars.set([sMeta[(first + a) * 4 + 1], sMeta[(first + b) * 4 + 1]], li * 2);
        li++;
      });
    });
    // the centre star of the finale
    sFrom.set([0, 0, 0], si * 3);
    sTo.set([0, 0, 0], si * 3);
    sMeta.set([4, -1, 150, 0], si * 4);
    // the four arcs (from the edge of each constellation to the centre, all curving the same way: a compass rose)
    UNITE.order.forEach((g, item) => {
      const c = centreOf(g);
      const len = Math.hypot(c.x, c.y);
      const ux = -c.x / len, uy = -c.y / len;
      const start = { x: c.x + ux * R * scale * 0.9, y: c.y + uy * R * scale * 0.9 };
      const end = { x: -ux * 0.3, y: -uy * 0.3 };
      const ctrl = { x: (start.x + end.x) / 2 - uy * len * 0.28, y: (start.y + end.y) / 2 + ux * len * 0.28 };
      const at = (t: number) => ({
        x: (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * ctrl.x + t * t * end.x,
        y: (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * ctrl.y + t * t * end.y,
      });
      const t0 = UNITE.at[item];
      for (let j = 0; j < ARC_SEGMENTS; j++) {
        const a = at(j / ARC_SEGMENTS), b = at((j + 1) / ARC_SEGMENTS);
        lA.set([a.x, a.y, 0], li * 3);
        lB.set([b.x, b.y, 0], li * 3);
        lSeg.set([4, t0 + (j / ARC_SEGMENTS) * UNITE.span, t0 + ((j + 1) / ARC_SEGMENTS) * UNITE.span, 0], li * 4);
        const col = tint(colors[g].clone().lerp(colors[4], j / ARC_SEGMENTS), 0.15);
        lCol.set([col.r, col.g, col.b], li * 3);
        lStars.set([-1, -1], li * 2);
        li++;
      }
    });
    // the ring around the centre star
    const ringCol = tint(colors[4], 0.2);
    for (let j = 0; j < RING_SEGMENTS; j++) {
      const a0 = (j / RING_SEGMENTS) * Math.PI * 2 + Math.PI / 2, a1 = ((j + 1) / RING_SEGMENTS) * Math.PI * 2 + Math.PI / 2;
      lA.set([Math.cos(a0) * RING, Math.sin(a0) * RING, 0], li * 3);
      lB.set([Math.cos(a1) * RING, Math.sin(a1) * RING, 0], li * 3);
      const t0 = UNITE.final + 0.02 + (j / RING_SEGMENTS) * 0.14;
      lSeg.set([4, t0, t0 + 0.14 / RING_SEGMENTS, 0], li * 4);
      lCol.set([ringCol.r, ringCol.g, ringCol.b], li * 3);
      lStars.set([-1, -1], li * 2);
      li++;
    }
    Object.values(starAttrs).forEach((a) => { a.needsUpdate = true; });
    Object.values(lineAttrs).forEach((a) => { a.needsUpdate = true; });
  };

  // ---------- camera: frame the focus inside the DOM box ----------
  const cam = { x: 0, y: 0, z: 14 };
  const goal = { x: 0, y: 0, z: 14 };
  let first = true;
  const frame = (w: number, h: number) => {
    const f = h / 2 / tan;                                      // CSS px per world unit at distance 1
    const b = sky.box;
    const bx = b.x + b.w / 2, by = b.y + b.h / 2;
    let cx = 0, cy = 0, d: number;
    if (sky.focus >= 0 && layout) {
      const c = centreOf(sky.focus);
      cx = c.x; cy = c.y;
      d = (R * layout.scale * f) / (Math.max(Math.min(b.w, b.h), 80) / 2);
    } else {
      const [hx, hy] = layout!.half;
      d = Math.max((hx * f) / (Math.max(b.w, 80) / 2), (hy * f) / (Math.max(b.h, 80) / 2));
    }
    d *= 1 - 0.14 * sky.push;
    d = Math.min(Math.max(d, 2.5), 60);
    goal.x = cx - ((bx - w / 2) * d) / f;
    goal.y = cy + ((by - h / 2) * d) / f;
    goal.z = d;
  };

  // pointer parallax (a mouse only; a finger leaves no pointer behind)
  const lean = { x: 0, y: 0 };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    gsap.to(lean, { x: (e.clientX / innerWidth - 0.5) * 2, y: (e.clientY / innerHeight - 0.5) * 2, duration: 1.4, ease: 'power3.out', overwrite: true });
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  // ---------- picking: the service star nearest to the pointer ----------
  const v = new Vector3();
  let hover = -1;
  const pick = (w: number, h: number) => {
    let best = -1, bestD = 30 * 30;
    if (sky.pointer.on && starU.uAssemble.value > 0.98) {
      for (let i = 0; i < 30; i++) {
        if (lit[svcGroup[i]] < 0.6) continue;
        v.copy(svcPos[i]).project(camera);
        const x = (v.x * 0.5 + 0.5) * w, y = (0.5 - v.y * 0.5) * h;
        const dd = (x - sky.pointer.x) ** 2 + (y - sky.pointer.y) ** 2;
        if (dd < bestD) { bestD = dd; best = i; sky.hoverAt.x = x; sky.hoverAt.y = y; }
      }
    }
    if (best !== hover) { hover = best; sky.hover = best; sky.onHover?.(best); }
  };

  // ---------- the stills of the css tier (dev: ?sky=…) ----------
  const poster = sky.poster;
  if (poster) {
    back.uGrain.value = 0;
    if (poster !== 'scatter' && poster !== 'all') { back.uBlack.value = 1; back.uStars.value = 0; field.uFade.value = 0; }
  }

  let assembleT = -1, lastFocus = -2, prevTime = -1;

  return {
    host,
    scene,
    camera,
    ready: () => layout !== null,
    update(time, deltaMs) {
      const w = host.clientWidth || 1, h = host.clientHeight || 1;
      if (!layout || sky.compact !== (layout === LAYOUT.compact)) build(sky.compact);
      const dt = Math.min(Math.max(prevTime < 0 ? 0 : time - prevTime, 0), 0.1) || deltaMs / 1000;
      prevTime = time;
      const t = poster ? 3 : time;
      common.uTime.value = back.uTime.value = field.uTime.value = t;

      // assembly: once, when the act first draws (the still behind it shows the scattered sky)
      if (assembleT < 0) assembleT = time;
      const assemble = poster === 'scatter' ? 0 : poster ? 1 : Math.min((time - assembleT) / 3.6, 1);
      starU.uAssemble.value = assemble;

      // focus → which constellation is lit and drawing
      const focus = sky.focus;
      if (focus !== lastFocus) { if (focus >= 0 && lastFocus !== -2) draw[focus] = 0; lastFocus = focus; }
      const k = 1 - Math.exp(-dt * 3);
      for (let g = 0; g < 4; g++) {
        const target = poster && poster !== 'scatter' && poster !== 'all' ? (g === focus ? 1 : 0)
          : focus < 0 ? 0.82 + 0.18 * sky.unite : g === focus ? 1 : 0.07;
        lit[g] += (target - lit[g]) * (poster ? 1 : k);
        draw[g] = poster === 'scatter' ? 0 : poster ? 1 : assemble < 0.75 ? 0 : Math.min(draw[g] + dt / (g === focus ? 1.5 : 2.2), 1);
      }
      draw[4] = sky.unite;
      const centre = Math.min(Math.max((sky.unite - UNITE.final) / 0.12, 0), 1);
      starU.uCentre.value = centre * centre * (3 - 2 * centre);
      common.uHot.value = sky.hot;
      starU.uHover.value = hover;
      back.uNight.value = sky.night;

      // camera
      frame(w, h);
      if (first || poster) { Object.assign(cam, goal); first = false; }
      else {
        const travel = Math.hypot(goal.x - cam.x, goal.y - cam.y);
        const kk = 1 - Math.exp(-dt * 2.2);
        cam.x += (goal.x - cam.x) * kk;
        cam.y += (goal.y - cam.y) * kk;
        cam.z += (goal.z + travel * 0.45 - cam.z) * kk;           // pull back a little while flying across
      }
      const drift = poster ? 0 : 1;
      camera.position.set(cam.x + lean.x * 0.035 * cam.z * drift, cam.y - lean.y * 0.025 * cam.z * drift, cam.z);
      camera.lookAt(camera.position.x, camera.position.y, 0);
      camera.updateMatrixWorld();
      back.uPan.value.set(camera.position.x * 0.012, camera.position.y * 0.012);
      pick(w, h);
    },
    resize(width, height) {
      const w = host.clientWidth || 1, h = host.clientHeight || 1;
      pr.value = width / w;
      res.value.set(width, height);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    dispose() {
      window.removeEventListener('pointermove', onMove);
      gsap.killTweensOf(lean);
      sky.onHover?.(-1);
      [backMesh.geometry, fieldGeo, starGeo, lineGeo, quad, strip].forEach((g) => g.dispose());
      [backMat, fieldMat, lineMat, starMat].forEach((m) => m.dispose());
    },
  };
}
