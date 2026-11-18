/**
 * Act "gala" — Exhibitions & Conferences page: "The show is about to begin". ONE world, our own procedural
 * geometry (no model file), the thread of the page from top to bottom:
 *
 *   the theatre   a proscenium with a red velvet traveller curtain (vertex-shader cloth: pleats that bunch as it is
 *                 drawn, a hem that lags, a breathing sway, velvet sheen, gold bullion fringe) under a swagged
 *                 valance; a raked hall of velvet seats, each with a small lamp (the seat map); an LED wall and a
 *                 turntable on the stage; interpreter booths at the back; spot beams, dust glittering in them,
 *                 press flashes
 *   the foyer     the expo floor at the top of the rake: floor-plan lines, then twenty stands that rise one by one
 *                 (frame → panels → header → counter → lights)
 *   the carpet    from the street door, through the foyer and the hall doors, down the aisle to the stage steps;
 *                 it unrolls with the scroll and the camera walks along it
 *   the badge     a guest badge on a lanyard (verlet rope + a hinged card), hung in front of the camera: the
 *                 visitor can grab and swing it; a line of light scans its QR code
 *
 * DEPTH: drawn into this act's own render target (depth + 4× MSAA + half float + mipmaps) in `prerender`; `scene`
 * is one full-screen pass (bloom from the mips, ACES, grain). One renderer, one context — see stage.ts.
 * Every device gets the full scene (quality policy). Only the stage's render scale adapts.
 * The world is decorative: every service, label and link lives in the DOM (the badge's word is decorative too —
 * the same word is in the DOM).
 */
import {
  AdditiveBlending, Box3, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, Color,
  CylinderGeometry, DoubleSide, DynamicDrawUsage, EquirectangularReflectionMapping, ExtrudeGeometry, FogExp2, Group,
  HalfFloatType, HemisphereLight, InstancedMesh, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial,
  MeshPhysicalMaterial, MeshStandardMaterial, NoToneMapping, Object3D, OrthographicCamera, PerspectiveCamera,
  PlaneGeometry, PMREMGenerator, PointLight, Points, Ray, RepeatWrapping, Scene, ShaderMaterial, Shape,
  ShapeGeometry, SpotLight, SRGBColorSpace, TorusGeometry, UnsignedByteType, Vector2, Vector3, Vector4,
  WebGLRenderTarget, type Material, type Texture, type WebGLRenderer,
} from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Act } from '../stage';
import { GALA_BOOTHS, gala } from '../bridge';
import {
  SPOTS, beamFragment, beamVertex, curtainFragment, curtainVertex, dustFragment, dustVertex, finishFragment,
  finishVertex, flashFragment, flashVertex, lampFragment, lampVertex, ledFragment, ledVertex, planFragment,
  planVertex, waveFragment, waveVertex,
} from '../shaders/gala.glsl';
import { token } from './util';

const clamp = (v: number, a = 0, b = 1) => Math.min(Math.max(v, a), b);
const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

// ---------- the theatre (metres; the stage edge is z ≈ 2.4, the audience looks toward -z) ----------
const STAGE_Y = 1.2;                 // stage floor
const OPEN_W = 9.3;                  // half width of the proscenium opening
const OPEN_H = 9.6;                  // curtain height
const CURTAIN_Z = -0.75;
const RAKE = 0.085;                  // the hall rises toward the back
const ROW0 = 6.5, ROWS = 24, ROW_GAP = 1.1, SEATS = 14, SEAT_GAP = 0.62, AISLE = 2.0;
const HALL_BACK = 36.2;
const TOP = (HALL_BACK - 6) * RAKE;  // floor height at the back of the hall = the foyer level
const FOYER_END = 116;
const CARPET_FROM = 114, CARPET_TO = 4.5;
const LED_Z = -11;
const TABLE = new Vector3(0, STAGE_Y, -4.6);
const BOOTHS = GALA_BOOTHS;
// the four stands that stand for a service (DOM legend order), always on the free side of the screen (not under the text)
const LABELLED_LTR = [10, 11, 14, 15], LABELLED_RTL = [9, 8, 13, 12];

/** floor height under the carpet at z (foyer level → down the rake → the flat front of the hall) */
const floorAt = (z: number) => (z >= HALL_BACK ? TOP : z <= 6 ? 0 : (z - 6) * RAKE);

// ---------- camera: one node per moment ----------
type Node = { p: [number, number, number]; t: [number, number, number]; fov: number; shift: number; dim: number };
const N = (p: Node['p'], t: Node['t'], fov = 42, shift = 0, dim = 1): Node => ({ p, t, fov, shift, dim });
const NODES = {
  hero0: N([0, 5.3, 15.5], [0, 5.5, 0], 36),
  heroWide: N([0, 9.2, 31.5], [0, 3.2, 0], 48),
  hero1: N([0, 3.6, 13.5], [0, 4.4, -8], 48),
  svc0: N([0, 1.75 + TOP, 116], [0, 1.6 + TOP, 90], 46),
  svc1: N([0, 1.8 + TOP, 102], [0, 1.7 + TOP, 78], 46),
  expo: N([0, 31 + TOP, 86], [0, TOP, 69.5], 42, 0.17),
  arr0: N([0, 2.2 + TOP, 60], [0, 2.4 + TOP, 36], 46, 0.1),
  arr1: N([0, 1.9 + TOP, 47], [0, 2.6 + TOP, 30], 46, 0.12),
  door: N([0, 1.9 + TOP, 33.6], [0, 1.6 + TOP, 20], 50, 0.06),
  reg: N([0, 8.4, 34.6], [0, 0.6, 15], 50, 0),
  int0: N([0, 3.6, 2.6], [0, 6.2, 36], 52, 0.12),
  int1: N([-7.5, 3.4, -5.2], [3, 5.2, -11], 50, 0.0),
  int2: N([7.2, 3.3, -6.4], [-2, 5.4, -11], 50, 0.0),
  types: N([0, 3.4, 5.4], [0, 2.0, -4.6], 44, 0.2),
  roof: N([0, 7.5, 27], [0, 3.2, -1], 46, 0),
  how0: N([-10.5, 2.6, 31], [0, 3.6, 0], 44, 0.18),
  how1: N([-6, 2.4, 17], [0, 3.8, -2], 44, 0.18),
  faq: N([8.5, 3.6, 22], [0, 3.6, 0], 44, 0.24, 0.62),
  call: N([0, 5.0, 16.5], [0, 5.4, 0], 38),
};

const lin = (c: Color) => c.clone().convertSRGBToLinear();
/** a semantic token as a CSS colour string (for canvas textures) — no hex in this file */
function cssColor(name: string, scope: Element, mixWith?: [string, number]) {
  const p = document.createElement('i');
  p.style.color = mixWith ? `color-mix(in srgb, var(${name}) ${mixWith[1]}%, var(${mixWith[0]}))` : `var(${name})`;
  scope.append(p);
  const c = getComputedStyle(p).color;
  p.remove();
  return c;
}

/** value noise, tiled: pile, wood, stone */
function noiseTexture(size: number, seed = 11) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const layers = [8, 16, 32, 64].map((cells) => ({ cells, grid: Float32Array.from({ length: cells * cells }, rnd) }));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0, amp = 0.5;
    for (const { cells, grid } of layers) {
      const fx = (x / size) * cells, fy = (y / size) * cells;
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0);
      const at = (i: number, j: number) => grid[(j % cells) * cells + (i % cells)];
      v += amp * mix(mix(at(x0, y0), at(x0 + 1, y0), tx), mix(at(x0, y0 + 1), at(x0 + 1, y0 + 1), tx), ty);
      amp *= 0.5;
    }
    const c = Math.round(clamp(v / 0.94) * 255);
    img.data.set([c, c, c, 255], (y * size + x) * 4);
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  return tex;
}

/** the eight event-type icons, engraved: one atlas (4 × 2 cells) used as colour (dark grooves) and as bump */
function engravingAtlas(icons: string[]) {
  const cell = 256, canvas = document.createElement('canvas');
  canvas.width = cell * 4; canvas.height = cell * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgb(255 255 255)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgb(52 52 52)';
  ctx.lineCap = ctx.lineJoin = 'round';
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate((i % 4) * cell + cell / 2, Math.floor(i / 4) * cell + cell / 2);
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 0, cell * 0.44, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, cell * 0.4, 0, Math.PI * 2); ctx.stroke();
    const k = (cell * 0.5) / 48;
    ctx.scale(k, k); ctx.translate(-24, -24);
    ctx.lineWidth = 2.6;
    if (icons[i]) ctx.stroke(new Path2D(icons[i]));
    ctx.restore();
  }
  const tex = new CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

/** a soft round light: the pools under the stands and on the stage */
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, 'rgb(255 255 255 / 1)'); grad.addColorStop(0.35, 'rgb(255 255 255 / 0.45)'); grad.addColorStop(1, 'rgb(255 255 255 / 0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

/** a decorative QR-like pattern (three finder squares, timing rows, seeded modules) — it encodes nothing */
function qrModules(n = 25, seed = 7) {
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const m: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => rnd() > 0.52));
  const finder = (r: number, c: number) => {
    for (let i = -1; i < 8; i++) for (let j = -1; j < 8; j++) {
      const y = r + i, x = c + j;
      if (y < 0 || x < 0 || y >= n || x >= n) continue;
      const ring = Math.max(Math.abs(i - 3), Math.abs(j - 3));
      m[y][x] = i >= 0 && j >= 0 && i < 7 && j < 7 && (ring === 3 || ring <= 1);
    }
  };
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
  for (let i = 8; i < n - 8; i++) { m[6][i] = i % 2 === 0; m[i][6] = i % 2 === 0; }
  return m;
}

/** the badge's face: our logo mark, the word «ضيف» / "Guest", a stripe, a QR-like pattern. No personal name. */
async function badgeTextures(scope: Element, lang: 'ar' | 'en') {
  const navy = cssColor('--color-bg', scope), ivory = cssColor('--color-ink', scope), amber = cssColor('--color-accent', scope), velvet = cssColor('--color-velvet', scope);
  try { await document.fonts.load('800 120px Almarai'); } catch { /* the fallback font is fine */ }
  const W = 512, H = 756;
  const front = document.createElement('canvas'); front.width = W; front.height = H;
  const g = front.getContext('2d')!;
  g.fillStyle = ivory; g.fillRect(0, 0, W, H);
  g.fillStyle = navy; g.fillRect(0, 0, W, 214);
  g.fillStyle = amber; g.fillRect(0, 214, W, 14);
  // the slot for the clip
  g.fillStyle = 'rgb(0 0 0 / 0.55)';
  g.beginPath(); g.roundRect(W / 2 - 54, 30, 108, 20, 10); g.fill();
  // the logo mark, read from the page's own inline SVG (header), never mirrored
  const svg = document.querySelector<SVGSVGElement>('.brand__mark svg, svg.brand__mark, .site-header svg');
  const vb = svg?.viewBox.baseVal;
  if (svg && vb && vb.width) {
    g.save();
    const k = 92 / vb.height;
    g.translate(W / 2 - (vb.width * k) / 2 - 92, 82); g.scale(k, k); g.translate(-vb.x, -vb.y);
    svg.querySelectorAll('path').forEach((p) => {
      if (p.classList.contains('mark-road')) return;
      g.fillStyle = p.classList.contains('mark-plane') ? amber : ivory;
      g.fill(new Path2D(p.getAttribute('d') ?? ''));
    });
    g.restore();
  }
  g.fillStyle = ivory; g.font = '800 64px Almarai, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.direction = 'ltr';
  g.fillText('WaysZ', W / 2 - 18, 132);
  // the word
  g.fillStyle = navy; g.textAlign = 'center';
  g.direction = lang === 'ar' ? 'rtl' : 'ltr';
  g.font = `800 ${lang === 'ar' ? 128 : 112}px Almarai, sans-serif`;
  g.fillText(lang === 'ar' ? 'ضيف' : 'Guest', W / 2, 336);
  g.fillStyle = velvet; g.fillRect(W / 2 - 46, 420, 92, 8);
  // QR-like pattern
  const m = qrModules(), cell = 9, size = m.length * cell, x0 = (W - size) / 2, y0 = 470;
  g.fillStyle = 'rgb(255 255 255)'; g.fillRect(x0 - 14, y0 - 14, size + 28, size + 28);
  g.fillStyle = navy;
  m.forEach((row, r) => row.forEach((on, c) => { if (on) g.fillRect(x0 + c * cell, y0 + r * cell, cell, cell); }));
  const qr = { y0: y0 / H, y1: (y0 + size) / H, w: size / W };

  const back = document.createElement('canvas'); back.width = W; back.height = H;
  const b = back.getContext('2d')!;
  b.fillStyle = navy; b.fillRect(0, 0, W, H);
  b.strokeStyle = amber; b.globalAlpha = 0.18; b.lineWidth = 2;
  for (let i = -H; i < W + H; i += 34) { b.beginPath(); b.moveTo(i, 0); b.lineTo(i + H * 0.6, H); b.stroke(); }
  b.globalAlpha = 1;
  b.fillStyle = 'rgb(0 0 0 / 0.55)'; b.beginPath(); b.roundRect(W / 2 - 54, 30, 108, 20, 10); b.fill();
  b.fillStyle = ivory; b.font = '800 72px Almarai, sans-serif'; b.textAlign = 'center'; b.textBaseline = 'middle'; b.direction = 'ltr';
  b.fillText('WaysZ', W / 2, H / 2);
  const tf = new CanvasTexture(front), tb = new CanvasTexture(back);
  tf.colorSpace = tb.colorSpace = SRGBColorSpace;
  tf.anisotropy = tb.anisotropy = 4;
  return { front: tf, back: tb, qr };
}

export function createGalaAct(host: HTMLElement): Act {
  const LABELLED = gala.side > 0 ? LABELLED_LTR : LABELLED_RTL;
  const keep: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => { keep.push(x); return x; };

  // ---------- colours: every one starts from a semantic token ----------
  const navy = token('--color-bg', host);
  const cNavy = lin(navy);
  const cAmber = lin(token('--color-accent', host));
  const cVelvet = lin(token('--color-velvet', host));
  const cDeep = lin(token('--color-velvet-deep', host));
  const cIvory = lin(token('--color-ink', host));
  const cWarm = lin(token('--color-accent', host, ['--color-ink', 55]));
  const cGold = lin(token('--color-accent', host, ['--color-ink', 82]));
  const cSky = lin(token('--color-focus', host));
  const cTeal = lin(token('--hue-software', host));
  const cCoral = lin(token('--hue-events', host));
  const cWall = lin(token('--color-bg', host, ['--color-velvet-deep', 80])).multiplyScalar(0.55);
  const cWood = lin(token('--color-velvet-deep', host, ['--color-bg', 40])).multiplyScalar(0.5);
  const cStone = lin(token('--color-bg', host, ['--color-ink', 88]));

  // =====================================================================================
  // world
  // =====================================================================================
  const world = new Scene();
  world.fog = new FogExp2(cNavy.clone().multiplyScalar(0.35), 0.011);
  const camera = new PerspectiveCamera(40, 1, 0.08, 400);
  world.add(camera);

  const noise = own(noiseTexture(256));
  const std = (color: Color, roughness = 0.8, metalness = 0, extra: Partial<MeshStandardMaterial> = {}) =>
    own(new MeshStandardMaterial({ color, roughness, metalness, ...extra }));
  const wallMat = std(cWall, 0.9);
  const woodMat = std(cWood, 0.55); woodMat.roughnessMap = noise;
  const blackMat = std(cNavy.clone().multiplyScalar(0.25), 0.7);
  const goldMat = std(cGold.clone().multiplyScalar(0.75), 0.34, 1, { envMapIntensity: 0.9 }); goldMat.bumpMap = noise; goldMat.bumpScale = 0.01; goldMat.roughnessMap = noise;
  const brassMat = std(cGold.clone().multiplyScalar(0.8), 0.36, 1, { envMapIntensity: 1.1 });
  const velvetMat = own(new MeshPhysicalMaterial({ color: cVelvet.clone().multiplyScalar(0.7), roughness: 0.9, sheen: 1, sheenColor: cVelvet.clone().lerp(cIvory, 0.3), sheenRoughness: 0.35 }));
  const floorMat = std(cStone.clone().multiplyScalar(0.45), 0.32, 0, { envMapIntensity: 0.35 }); floorMat.roughnessMap = noise;
  const panelMat = std(cIvory.clone().multiplyScalar(0.8), 0.55);
  const alumMat = std(cIvory.clone().multiplyScalar(0.7), 0.3, 1, { envMapIntensity: 0.9 });

  // ---------- lights ----------
  const hemi = new HemisphereLight(lin(token('--color-focus', host, ['--color-bg', 30])), cDeep, 0.1);
  world.add(hemi);
  const ledLight = new PointLight(cCoral, 0, 30, 2);
  ledLight.position.set(0, 5.5, LED_Z + 2.5);
  const foyerLights = [84, 58].map((z) => { const l = new PointLight(cWarm, 0, 30, 2); l.position.set(0, TOP + 8.5, z); return l; });
  const meet = new PointLight(cWarm, 0, 14, 2);          // where the four beams meet
  meet.position.set(0, STAGE_Y + 1.2, -3.2);
  const house = [new PointLight(cWarm, 0, 34, 2), new PointLight(cWarm, 0, 34, 2)];
  house[0].position.set(-6, 12, 22); house[1].position.set(6, 12, 22);
  world.add(ledLight, meet, ...house, ...foyerLights);

  // ---------- the spot rig: 0 follow spot · 1–4 moving heads (they light surfaces) · 5–8 beams of "one roof" ----------
  type Spot = { pos: Vector3; aim: Vector3; cos: number; i: number; gPos: Vector3; gAim: Vector3; gCos: number; gI: number; col: Color };
  const HEADS = [new Vector3(-5, 13.2, 8), new Vector3(5, 13.2, 8), new Vector3(-9.5, 13.2, 18.5), new Vector3(9.5, 13.2, 18.5)];
  const CORNERS = [new Vector3(-15, 13.6, 2.5), new Vector3(15, 13.6, 2.5), new Vector3(-15, 13.6, 31), new Vector3(15, 13.6, 31)];
  const FOLLOW = new Vector3(0, 13.8, 34.4);
  const spots: Spot[] = Array.from({ length: SPOTS }, (_, k) => {
    const pos = k === 0 ? FOLLOW.clone() : k <= 4 ? HEADS[k - 1].clone() : CORNERS[k - 5].clone();
    const col = k === 0 ? cWarm.clone().lerp(cIvory, 0.45) : k <= 4 ? cWarm.clone() : [cSky, cIvory, cTeal, cAmber][k - 5].clone().lerp(cIvory, 0.25);
    return { pos, aim: new Vector3(0, 4, 0), cos: Math.cos(0.2), i: 0, gPos: pos.clone(), gAim: new Vector3(0, 4, 0), gCos: Math.cos(0.2), gI: 0, col };
  });
  const spotU = {
    uSpotPos: { value: spots.map((s) => s.pos) },
    uSpotDir: { value: spots.map(() => new Vector3(0, -1, 0)) },
    uSpotCos: { value: spots.map((s) => s.cos) },
    uSpotI: { value: spots.map(() => 0) },
    uSpotCol: { value: spots.map((s) => s.col) },
  };
  const lamps = spots.slice(0, 5).map((s) => {
    const l = new SpotLight(s.col, 0, 0, 0.2, 0.55, 2);
    l.position.copy(s.pos);
    world.add(l, l.target);
    return l;
  });

  const time = { value: 0 };

  // =====================================================================================
  // the hall
  // =====================================================================================
  const add = <T extends Object3D>(o: T) => { world.add(o); return o; };
  // static boxes are collected per material and merged into ONE mesh each (bake()): a few draw calls, not a hundred
  const statics = new Map<Material, BufferGeometry[]>();
  const box = (w: number, h: number, d: number, mat: Material, x: number, y: number, z: number) => {
    const g = new BoxGeometry(w, h, d).translate(x, y, z);
    if (!statics.has(mat)) statics.set(mat, []);
    statics.get(mat)!.push(g);
  };
  const bake = () => {
    statics.forEach((list, mat) => {
      const merged = own(mergeGeometries(list)!);
      list.forEach((g) => g.dispose());
      add(new Mesh(merged, mat));
    });
    statics.clear();
  };
  // floors: the flat front, the rake, the stage
  const front = new Mesh(own(new PlaneGeometry(32, 4.2)), woodMat);
  front.rotation.x = -Math.PI / 2; front.position.set(0, 0, 4.4); add(front);
  const rakeLen = Math.hypot(HALL_BACK - 6, TOP);
  const rake = new Mesh(own(new PlaneGeometry(32, rakeLen)), woodMat);
  rake.rotation.x = -Math.PI / 2 + Math.atan(RAKE); rake.position.set(0, TOP / 2, (HALL_BACK + 6) / 2); add(rake);
  const deckStage = std(cNavy.clone().multiplyScalar(0.18), 0.38, 0, { envMapIntensity: 0.5 }); deckStage.roughnessMap = noise;
  box(32, STAGE_Y, 16.4, deckStage, 0, STAGE_Y / 2, -5.8);
  box(32, 0.05, 0.1, own(new MeshBasicMaterial({ color: cWarm.clone().multiplyScalar(3) })), 0, STAGE_Y + 0.03, 2.3);   // footlights
  for (let i = 0; i < 4; i++) box(3.4, STAGE_Y * (1 - i / 4), 0.5, woodMat, 0, (STAGE_Y * (1 - i / 4)) / 2, 2.65 + i * 0.5);
  // walls, ceiling
  for (const sx of [-1, 1]) box(0.6, 16, 52, wallMat, sx * 16.3, 8, 10);
  box(33, 0.4, 52, blackMat, 0, 15.5, 10);
  box(33, 16, 0.6, wallMat, 0, 8, -14.3);
  // back wall with the hall doors (foyer level) and the interpreter booths above them
  const DOOR_W = 5.2, DOOR_H = 4.4;
  box(16.5 - DOOR_W / 2, 16, 0.6, wallMat, -(DOOR_W / 2 + (16.5 - DOOR_W / 2) / 2), 8, HALL_BACK + 0.3);
  box(16.5 - DOOR_W / 2, 16, 0.6, wallMat, DOOR_W / 2 + (16.5 - DOOR_W / 2) / 2, 8, HALL_BACK + 0.3);
  box(DOOR_W, 16 - TOP - DOOR_H, 0.6, wallMat, 0, TOP + DOOR_H + (16 - TOP - DOOR_H) / 2, HALL_BACK + 0.3);
  for (const sx of [-1, 1]) box(0.22, DOOR_H, 0.8, goldMat, sx * DOOR_W / 2, TOP + DOOR_H / 2, HALL_BACK + 0.3);
  box(DOOR_W + 0.44, 0.22, 0.8, goldMat, 0, TOP + DOOR_H, HALL_BACK + 0.3);
  const glassMat = own(new MeshBasicMaterial({ color: cWarm.clone().multiplyScalar(1.6) }));
  for (const sx of [-1, 1]) {
    box(6.4, 0.25, 1.2, blackMat, sx * 6.6, TOP + 5.3, HALL_BACK - 0.4);              // sill
    box(6, 1.7, 0.05, glassMat, sx * 6.6, TOP + 6.3, HALL_BACK - 0.02);
    for (let k = 0; k < 4; k++) box(0.12, 1.8, 0.2, blackMat, sx * 6.6 - 3 + k * 2, TOP + 6.3, HALL_BACK - 0.08);
  }
  // acoustic fins and sconces along the side walls
  const finGeo = own(new BoxGeometry(0.35, 9, 0.6));
  const fins = new InstancedMesh(finGeo, wallMat, 2 * 12);
  const sconceGeo = own(new BoxGeometry(0.12, 0.5, 0.3));
  const sconces = new InstancedMesh(sconceGeo, own(new MeshBasicMaterial({ color: cWarm.clone().multiplyScalar(4) })), 2 * 11);
  const dummy = new Object3D();
  let f = 0, sc = 0;
  for (const sx of [-1, 1]) for (let k = 0; k < 12; k++) {
    const z = -1 + k * 3.2;
    dummy.position.set(sx * 15.85, 6.5, z); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); fins.setMatrixAt(f++, dummy.matrix);
    if (k < 11) { dummy.position.set(sx * 15.9, 5.6, z + 1.6); dummy.updateMatrix(); sconces.setMatrixAt(sc++, dummy.matrix); }
  }
  add(fins); add(sconces);
  // two tiers of boxes along the side walls: velvet parapets with a gilded rail, a warm lamp between each pair
  const BOXES = 5, TIERS = [5.4, 8.9];
  const parapets = new InstancedMesh(own(new BoxGeometry(1, 1, 1)), velvetMat, 2 * BOXES * TIERS.length);
  const rails = new InstancedMesh(own(new BoxGeometry(1, 1, 1)), goldMat, 2 * BOXES * TIERS.length * 2);
  const boxLamps = new InstancedMesh(own(new CylinderGeometry(0.09, 0.09, 0.32, 10)), own(new MeshBasicMaterial({ color: cWarm.clone().multiplyScalar(4) })), 2 * BOXES * TIERS.length);
  let bp = 0, br = 0;
  for (const sx of [-1, 1]) TIERS.forEach((y) => { for (let k = 0; k < BOXES; k++) {
    const z = 7.5 + k * 5.2, x = sx * 14.7;
    dummy.rotation.set(0, 0, 0);
    dummy.position.set(x, y, z); dummy.scale.set(1.5, 1.05, 4.3); dummy.updateMatrix(); parapets.setMatrixAt(bp, dummy.matrix);
    dummy.position.set(x - sx * 0.72, y + 0.56, z); dummy.scale.set(0.14, 0.09, 4.4); dummy.updateMatrix(); rails.setMatrixAt(br++, dummy.matrix);
    dummy.position.set(x - sx * 0.72, y - 0.5, z); dummy.scale.set(0.1, 0.07, 4.4); dummy.updateMatrix(); rails.setMatrixAt(br++, dummy.matrix);
    dummy.position.set(x + sx * 0.4, y + 1.1, z + 2.6); dummy.scale.setScalar(1); dummy.updateMatrix(); boxLamps.setMatrixAt(bp++, dummy.matrix);
  } });
  add(parapets); add(rails); add(boxLamps);

  // trusses with the fixtures of the moving heads and the corner beams
  for (const z of [8, 18.5]) box(22, 0.3, 0.3, blackMat, 0, 13.6, z);
  const fixtureGeo = own(new CylinderGeometry(0.22, 0.3, 0.55, 18));
  const fixtures = new InstancedMesh(fixtureGeo, blackMat, 8);
  [...HEADS, ...CORNERS].forEach((p, k) => { dummy.position.copy(p); dummy.updateMatrix(); fixtures.setMatrixAt(k, dummy.matrix); });
  add(fixtures);

  // ---------- the proscenium, the gold frame, the valance and the curtain ----------
  box(6.7, 16, 0.6, wallMat, -(OPEN_W + 3.35), 8, 0);
  box(6.7, 16, 0.6, wallMat, OPEN_W + 3.35, 8, 0);
  box(2 * OPEN_W, 16 - STAGE_Y - OPEN_H - 0.6, 0.6, wallMat, 0, STAGE_Y + OPEN_H + 0.6 + (16 - STAGE_Y - OPEN_H - 0.6) / 2, 0);
  // the proscenium's gilded frame: three stepped mouldings read as one carved profile
  for (const [w, d, z, o] of [[0.62, 0.18, 0.36, 0.42], [0.2, 0.3, 0.5, 0.2], [0.1, 0.36, 0.56, 0.05]] as const) {
    for (const sx of [-1, 1]) box(w, OPEN_H + 0.8 + o * 2, d, goldMat, sx * (OPEN_W + o), STAGE_Y + (OPEN_H + 0.8 + o * 2) / 2 - o, z);
    box(2 * (OPEN_W + o) + w, w, d, goldMat, 0, STAGE_Y + OPEN_H + 0.8 + o, z);
  }

  const curtainU = {
    ...spotU,
    uOpen: { value: 0 }, uVel: { value: 0 }, uTime: time, uW: { value: OPEN_W }, uY0: { value: STAGE_Y - 0.02 }, uH: { value: OPEN_H + 0.3 },
    uZ: { value: CURTAIN_Z }, uPleats: { value: 15 }, uSpan: { value: 2 * OPEN_W + 1 },
    uVelvet: { value: cVelvet }, uDeep: { value: cDeep }, uSheen: { value: cVelvet.clone().lerp(cWarm, 0.45).multiplyScalar(1.4) },
    uGold: { value: cGold }, uAmb: { value: cVelvet.clone().multiplyScalar(0.035) }, uFoot: { value: cWarm }, uFootI: { value: 1.3 },
  };
  const curtainGeo = own(new PlaneGeometry(1, 1, 150, 60));
  [-1, 1].forEach((side) => {
    const mat = own(new ShaderMaterial({
      vertexShader: curtainVertex, fragmentShader: curtainFragment, side: DoubleSide,
      uniforms: { ...curtainU, uSide: { value: side }, uMode: { value: 0 } },
    }));
    const m = new Mesh(curtainGeo, mat);
    m.frustumCulled = false;
    add(m);
  });
  const valanceMat = own(new ShaderMaterial({
    vertexShader: curtainVertex, fragmentShader: curtainFragment, side: DoubleSide,
    uniforms: { ...curtainU, uSide: { value: 1 }, uMode: { value: 1 }, uY0: { value: STAGE_Y + OPEN_H - 1.1 }, uH: { value: 1.9 }, uZ: { value: -0.42 }, uPleats: { value: 34 } },
  }));
  const valance = add(new Mesh(own(new PlaneGeometry(1, 1, 200, 12)), valanceMat));
  valance.frustumCulled = false;

  // ---------- the LED wall and its frame ----------
  const ledMat = own(new ShaderMaterial({
    vertexShader: ledVertex, fragmentShader: ledFragment,
    uniforms: { uTime: time, uI: { value: 0 }, uNavy: { value: cNavy.clone().multiplyScalar(0.6) }, uRed: { value: cVelvet.clone().multiplyScalar(1.3) }, uAmber: { value: cAmber }, uIvory: { value: cIvory }, uGrid: { value: new Vector2(176, 80) } },
  }));
  const led = add(new Mesh(own(new PlaneGeometry(15.6, 7.1)), ledMat));
  led.position.set(0, STAGE_Y + 0.9 + 3.55, LED_Z);
  box(16.1, 7.6, 0.3, blackMat, 0, led.position.y, LED_Z - 0.2);

  // ---------- the turntable: eight plinths, each with an engraved medallion (the event types) ----------
  const table = new Group();
  table.position.copy(TABLE);
  add(table);
  const disc = new Mesh(own(new CylinderGeometry(3.6, 3.7, 0.18, 96)), std(cNavy.clone().multiplyScalar(0.5), 0.25, 0.2, { envMapIntensity: 0.6 }));
  disc.position.y = 0.09;
  const rim = new Mesh(own(new TorusGeometry(3.66, 0.05, 10, 120)), goldMat);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.18;
  const bulbs = new InstancedMesh(own(new CylinderGeometry(0.035, 0.035, 0.03, 8)), own(new MeshBasicMaterial({ color: cWarm.clone().multiplyScalar(5) })), 64);
  for (let k = 0; k < 64; k++) { const a = (k / 64) * Math.PI * 2; dummy.position.set(Math.cos(a) * 3.55, 0.19, Math.sin(a) * 3.55); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); bulbs.setMatrixAt(k, dummy.matrix); }
  table.add(disc, rim, bulbs);
  const atlas = own(engravingAtlas(gala.icons));
  atlas.colorSpace = SRGBColorSpace;
  const faceMat = std(cGold.clone().multiplyScalar(1.1), 0.3, 1, { map: atlas, bumpMap: atlas, bumpScale: 0.8, envMapIntensity: 1.4 });
  const plinthGeo = own(new CylinderGeometry(0.42, 0.5, 1.05, 40));
  const medalGeo = own(new CylinderGeometry(0.5, 0.5, 0.07, 64));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const holder = new Group();
    holder.position.set(Math.sin(a) * 2.55, 0.18, Math.cos(a) * 2.55);
    holder.rotation.y = a;
    const plinth = new Mesh(plinthGeo, woodMat); plinth.position.y = 0.52;
    const ring = new Mesh(own(new TorusGeometry(0.46, 0.025, 8, 48)), goldMat); ring.rotation.x = Math.PI / 2; ring.position.y = 1.04;
    const face = own(medalGeo.clone());
    face.rotateX(Math.PI / 2);
    const uv = face.attributes.uv, pos = face.attributes.position;
    for (let k = 0; k < uv.count; k++) {                    // planar uv from the disc's own x / y → its atlas cell
      const u = pos.getX(k) / 1.0 + 0.5, v = pos.getY(k) / 1.0 + 0.5;
      uv.setXY(k, (u + (i % 4)) / 4, (v + (1 - Math.floor(i / 4))) / 2);
    }
    const medal = new Mesh(face, faceMat); medal.position.y = 1.62;
    holder.add(plinth, ring, medal);
    table.add(holder);
  }

  // ---------- seats with their lamps (the seat map) ----------
  const seatGeo = own(mergeGeometries([
    new BoxGeometry(0.52, 0.12, 0.5).translate(0, 0.44, 0),
    new BoxGeometry(0.52, 0.66, 0.1).translate(0, 0.8, 0.24).rotateX(-0.12),
    new BoxGeometry(0.06, 0.24, 0.46).translate(-0.29, 0.56, 0.02),
    new BoxGeometry(0.42, 0.38, 0.06).translate(0, 0.19, 0.12),
  ])!);
  const seatCount = ROWS * SEATS * 2;
  const seats = new InstancedMesh(seatGeo, velvetMat, seatCount);
  const lampPos = new Float32Array(seatCount * 3), lampOrder = new Float32Array(seatCount);
  let s = 0;
  for (let r = 0; r < ROWS; r++) for (const sx of [-1, 1]) for (let j = 0; j < SEATS; j++) {
    const z = ROW0 + r * ROW_GAP, x = sx * (AISLE + j * SEAT_GAP);
    const curve = Math.pow(Math.abs(x) / 12, 2) * 0.9;     // rows curve gently toward the stage
    const y = floorAt(z + curve);
    dummy.position.set(x, y, z + curve); dummy.rotation.set(0, -sx * Math.abs(x) * 0.012, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
    seats.setMatrixAt(s, dummy.matrix);
    seats.setColorAt(s, new Color(1, 1, 1));
    lampPos.set([x, y + 1.17, z + curve + 0.29], s * 3);
    // registration fills the hall row by row from the front, each row from the aisle outward (both sides at once)
    lampOrder[s] = (r + (j / SEATS) * 0.92 + (sx > 0 ? 0.02 : 0)) / ROWS;
    s++;
  }
  add(seats);
  const lampGeo = own(new BufferGeometry());
  lampGeo.setAttribute('position', new BufferAttribute(lampPos, 3));
  lampGeo.setAttribute('aOrder', new BufferAttribute(lampOrder, 1));
  const lampMat = own(new ShaderMaterial({
    vertexShader: lampVertex, fragmentShader: lampFragment, transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uFill: { value: 0 }, uSize: { value: 30 }, uTime: time, uOn: { value: cWarm }, uOff: { value: cDeep.clone().multiplyScalar(0.35) } },
  }));
  const seatLamps = add(new Points(lampGeo, lampMat));
  seatLamps.frustumCulled = false;
  let litSeats = -1;

  // ---------- the interpreters' sound waves: ribbons from the booths over the seats to the stage ----------
  const ribbons: { from: Vector3; mid: Vector3; to: Vector3; seed: number }[] = [
    { from: new Vector3(-6.6, TOP + 6.3, HALL_BACK - 0.5), mid: new Vector3(-5, 11, 18), to: new Vector3(-2.4, 4.6, 2), seed: 0.3 },
    { from: new Vector3(6.6, TOP + 6.3, HALL_BACK - 0.5), mid: new Vector3(5, 11.5, 18), to: new Vector3(2.4, 4.6, 2), seed: 1.7 },
    { from: new Vector3(0, TOP + 7.4, HALL_BACK - 0.5), mid: new Vector3(0, 12.6, 20), to: new Vector3(0, 6, 1.5), seed: 3.1 },
  ];
  const segs = 180, wPos: number[] = [], wUv: number[] = [], wSeed: number[] = [], wIdx: number[] = [];
  const bez = (a: Vector3, b: Vector3, c: Vector3, t: number) => new Vector3().copy(a).multiplyScalar((1 - t) * (1 - t)).addScaledVector(b, 2 * (1 - t) * t).addScaledVector(c, t * t);
  ribbons.forEach(({ from, mid, to, seed }) => {
    const base = wPos.length / 3;
    for (let k = 0; k <= segs; k++) {
      const t = k / segs, p = bez(from, mid, to, t), h = 1.6 + Math.sin(t * Math.PI) * 1.4;
      wPos.push(p.x, p.y - h / 2, p.z, p.x, p.y + h / 2, p.z);
      wUv.push(t, 0, t, 1); wSeed.push(seed, seed);
      if (k < segs) { const a = base + k * 2; wIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
  });
  const waveGeo = own(new BufferGeometry());
  waveGeo.setAttribute('position', new BufferAttribute(new Float32Array(wPos), 3));
  waveGeo.setAttribute('uv', new BufferAttribute(new Float32Array(wUv), 2));
  waveGeo.setAttribute('aSeed', new BufferAttribute(new Float32Array(wSeed), 1));
  waveGeo.setIndex(wIdx);
  const waveMat = own(new ShaderMaterial({
    vertexShader: waveVertex, fragmentShader: waveFragment, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { uTime: time, uI: { value: 0 }, uColorA: { value: cAmber.clone().multiplyScalar(1.4) }, uColorB: { value: cSky.clone().lerp(cIvory, 0.4).multiplyScalar(1.4) } },
  }));
  const waves = add(new Mesh(waveGeo, waveMat));
  waves.frustumCulled = false;

  // =====================================================================================
  // the foyer: the expo floor
  // =====================================================================================
  const foyerLen = FOYER_END - HALL_BACK;
  const foyerFloor = new Mesh(own(new PlaneGeometry(52, foyerLen)), floorMat);
  foyerFloor.rotation.x = -Math.PI / 2; foyerFloor.position.set(0, TOP, HALL_BACK + foyerLen / 2); add(foyerFloor);
  for (const sx of [-1, 1]) box(0.5, 11, foyerLen, wallMat, sx * 26, TOP + 5.5, HALL_BACK + foyerLen / 2);
  // pendant lamps in rows over the aisles (no ceiling: the expo is filmed from above)
  // lit only underneath: from above (the expo shot) they are dark discs, not glare
  const pendants = new InstancedMesh(own(new CylinderGeometry(0.32, 0.26, 0.1, 20)), [blackMat, blackMat, own(new MeshBasicMaterial({ color: cWarm.clone().multiplyScalar(3.2) }))], 3 * 13);
  for (let k = 0; k < 13; k++) for (const [j, sx] of [-1, 0, 1].entries()) { dummy.position.set(sx * 8.3, TOP + 8.6, HALL_BACK + 6 + k * 5.6); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); pendants.setMatrixAt(k * 3 + j, dummy.matrix); }
  add(pendants);
  // the street door: a tall glass frame
  for (const sx of [-3, -1, 1, 3]) box(0.18, 6.5, 0.25, alumMat, sx * 1.8, TOP + 3.25, FOYER_END - 0.5);
  box(14.6, 0.25, 0.25, alumMat, 0, TOP + 6.5, FOYER_END - 0.5);

  type Booth = { c: Vector3; out: number; w: number; d: number; tint: Color; u: number };
  const tints = [cAmber, cVelvet, cSky, cTeal, cCoral];
  const booths: Booth[] = [];
  const rowsZ = [91, 81, 71, 61, 51];
  rowsZ.forEach((z, r) => [-11.6, -5, 5, 11.6].forEach((x, c) => {
    booths.push({ c: new Vector3(x, TOP, z), out: Math.abs(x) < 8 ? Math.sign(x) : -Math.sign(x), w: 5.4, d: 4.4, tint: tints[(r * 4 + c * 3) % tints.length], u: 0 });
  }));
  // rise order: from the street door toward the hall, across the aisle
  const order = booths.map((_, i) => i).sort((a, b) => booths[b].c.z - booths[a].c.z || Math.abs(booths[a].c.x) - Math.abs(booths[b].c.x));
  const rank = new Array<number>(BOOTHS);
  order.forEach((b, k) => { rank[b] = k; });

  const part = (geo: BufferGeometry, mat: Material, count: number) => {
    const m = new InstancedMesh(own(geo), mat, count);
    m.instanceMatrix.setUsage(DynamicDrawUsage);
    m.frustumCulled = false;
    return add(m);
  };
  const deckMat = std(cStone.clone().multiplyScalar(0.7), 0.6);
  const glowBasic = () => own(new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  const stripeMat = std(new Color(1, 1, 1), 0.4);
  const decks = part(new BoxGeometry(1, 1, 1), deckMat, BOOTHS);
  const posts = part(new BoxGeometry(0.1, 1, 0.1), alumMat, BOOTHS * 4);
  const backs = part(new BoxGeometry(1, 1, 0.1), panelMat, BOOTHS);
  const sides = part(new BoxGeometry(1, 1, 0.1), panelMat, BOOTHS);
  const fascias = part(new BoxGeometry(1, 0.62, 0.12), stripeMat, BOOTHS);
  const counters = part(new BoxGeometry(1.7, 1.05, 0.62), stripeMat, BOOTHS);
  const screenMat = glowBasic();
  const screens = part(new PlaneGeometry(2.6, 1.5), screenMat, BOOTHS);
  const heads = part(new BoxGeometry(0.22, 0.14, 0.22), glowBasic(), BOOTHS * 2);
  const glowTex = own(glowTexture());
  const poolMat = own(new MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: AdditiveBlending, color: 0xffffff }));
  const pools = part(new PlaneGeometry(1, 1), poolMat, BOOTHS * 2);
  for (const m of [fascias, counters, screens, heads, pools, backs, sides]) for (let i = 0; i < m.count; i++) m.setColorAt(i, new Color(0, 0, 0));

  const planRects = booths.map((b) => new Vector4(b.c.x, b.c.z, b.d / 2, b.w / 2));
  const planLit = booths.map(() => 0);
  const planMat = own(new ShaderMaterial({
    vertexShader: planVertex, fragmentShader: planFragment(BOOTHS), transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uRect: { value: planRects }, uLit: { value: planLit }, uDraw: { value: 0 }, uFade: { value: 1 }, uColor: { value: cSky.clone().lerp(cIvory, 0.35).multiplyScalar(0.5) }, uHot: { value: cAmber } },
  }));
  const plan = add(new Mesh(own(new PlaneGeometry(52, foyerLen)), planMat));
  plan.rotation.x = -Math.PI / 2; plan.position.set(0, TOP + 0.02, HALL_BACK + foyerLen / 2);

  const box3 = new Box3();
  /** one stand at progress u (0 = only its outline on the floor … 1 = built and lit); lit = hover boost */
  const placeBooth = (i: number, u: number, lit: number) => {
    const b = booths[i], o = b.out;                       // o: +1 = its back panel faces +x
    const hw = b.d / 2, hd = b.w / 2;                     // half sizes along x and z
    const set = (mesh: InstancedMesh, k: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0) => {
      dummy.position.set(b.c.x + x, b.c.y + y, b.c.z + z);
      dummy.rotation.set(0, ry, 0);
      dummy.scale.set(Math.max(sx, 1e-4), Math.max(sy, 1e-4), Math.max(sz, 1e-4));
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
    };
    const pDeck = smooth(span(u, 0, 0.12)), pPost = smooth(span(u, 0.06, 0.36)), pPanel = smooth(span(u, 0.3, 0.64));
    const pFascia = smooth(span(u, 0.55, 0.76)), pCounter = smooth(span(u, 0.66, 0.82)), pLight = span(u, 0.82, 1);
    set(decks, i, 0, 0.05 * pDeck, 0, b.d, 0.1 * pDeck, b.w);
    const H = 3.1;
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, c], k) => set(posts, i * 4 + k, a * (hw - 0.05), 0.1 + (H * pPost) / 2, c * (hd - 0.05), 1, H * pPost, 1));
    set(backs, i, o * (hw - 0.06), 0.1 + (H * 0.94 * pPanel) / 2, 0, b.w - 0.1, H * 0.94 * pPanel, 1, Math.PI / 2);
    set(sides, i, 0, 0.1 + (H * 0.94 * pPanel) / 2, -(hd - 0.06), b.d - 0.1, H * 0.94 * pPanel, 1);
    set(fascias, i, -o * (hw - 0.06), H - 0.32 + (1 - pFascia) * 2.4, 0, b.w * pFascia, 1, 1, Math.PI / 2);
    set(counters, i, -o * (hw - 0.9), 0.1 + 0.525 * pCounter, hd * 0.45, pCounter, pCounter, pCounter, Math.PI / 2);
    set(screens, i, o * (hw - 0.13), 1.75, 0, pPanel > 0.98 ? 1 : 0.0001, pPanel > 0.98 ? 1 : 0.0001, 1, -o * Math.PI / 2);
    // lights switch on with a flicker, the way real stand lights do
    const flick = pLight <= 0 ? 0 : pLight >= 1 ? 1 : (Math.sin(pLight * 47) > -0.2 ? 1 : 0.15) * pLight;
    const boost = (1 + lit * 2.4) * (1 - dimOthers * 0.55 * (1 - lit));
    for (let k = 0; k < 2; k++) {
      set(heads, i * 2 + k, o * (hw - 0.45), H - 0.25, (k ? 1 : -1) * hd * 0.45, 1, 1, 1);
      heads.setColorAt(i * 2 + k, e.copy(cWarm).multiplyScalar(6 * flick * boost));
    }
    // two pools of light: on the back panel, and flat on the floor of the stand
    set(pools, i * 2, o * (hw - 0.2), 1.5, 0, 3.4, 3.0, 1, -o * Math.PI / 2);
    dummy.position.set(b.c.x, b.c.y + 0.12, b.c.z); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.set(b.d * 1.3, b.w * 1.15, 1); dummy.updateMatrix();
    pools.setMatrixAt(i * 2 + 1, dummy.matrix);
    pools.setColorAt(i * 2, e.copy(cWarm).multiplyScalar(0.6 * flick * boost));
    pools.setColorAt(i * 2 + 1, e.copy(cWarm).multiplyScalar(0.28 * flick * boost));
    fascias.setColorAt(i, e.copy(b.tint).multiplyScalar((0.9 + lit * 2.2) * (1 - dimOthers * 0.4 * (1 - lit))));
    backs.setColorAt(i, e.copy(cIvory).lerp(b.tint, 0.55));
    sides.setColorAt(i, e.copy(cIvory).lerp(b.tint, 0.18).multiplyScalar(0.8));
    counters.setColorAt(i, e.copy(cIvory).lerp(b.tint, 0.25).multiplyScalar(0.85));
    screens.setColorAt(i, e.copy(b.tint).lerp(cIvory, 0.2).multiplyScalar((0.5 + lit * 3) * flick));
  };
  const e = new Color();
  let dimOthers = 0, boothsMoved = true;                                       // 0…1: one stand is lit, the rest step back

  // =====================================================================================
  // the red carpet: from the street door to the stage steps, unrolling with the scroll
  // =====================================================================================
  const carpetCanvas = document.createElement('canvas');
  carpetCanvas.width = 128; carpetCanvas.height = 128;
  {
    const g = carpetCanvas.getContext('2d')!;
    g.fillStyle = cssColor('--color-velvet', host); g.fillRect(0, 0, 128, 128);
    g.fillStyle = cssColor('--color-accent', host, ['--color-ink', 80]); g.fillRect(4, 0, 5, 128); g.fillRect(119, 0, 5, 128);
    g.fillStyle = cssColor('--color-velvet-deep', host); g.fillRect(0, 0, 4, 128); g.fillRect(124, 0, 4, 128);
  }
  const carpetTex = own(new CanvasTexture(carpetCanvas));
  carpetTex.colorSpace = SRGBColorSpace;
  carpetTex.wrapT = RepeatWrapping;
  carpetTex.repeat.set(1, 1);
  const carpetFront = { value: CARPET_FROM };
  const carpetMat = own(new MeshPhysicalMaterial({ map: carpetTex, roughness: 0.95, sheen: 1, sheenColor: cVelvet.clone().lerp(cIvory, 0.35), sheenRoughness: 0.4, bumpMap: noise, bumpScale: 0.02 }));
  carpetMat.onBeforeCompile = (shader) => {
    shader.uniforms.uFront = carpetFront;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vCz;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCz = (modelMatrix * vec4(position, 1.0)).z;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uFront;\nvarying float vCz;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vCz < uFront) discard;');
  };
  const CW = 2.3, cSegs = 520, cPos: number[] = [], cUv: number[] = [], cIdx: number[] = [];
  for (let k = 0; k <= cSegs; k++) {
    const z = mix(CARPET_FROM, CARPET_TO, k / cSegs), y = floorAt(z) + 0.022;
    cPos.push(-CW / 2, y, z, CW / 2, y, z);
    const v = (CARPET_FROM - z) / 2.4;
    cUv.push(0, v, 1, v);
    if (k < cSegs) { const a = k * 2; cIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const carpetGeo = own(new BufferGeometry());
  carpetGeo.setAttribute('position', new BufferAttribute(new Float32Array(cPos), 3));
  carpetGeo.setAttribute('uv', new BufferAttribute(new Float32Array(cUv), 2));
  carpetGeo.setIndex(cIdx);
  carpetGeo.computeVertexNormals();
  const carpet = add(new Mesh(carpetGeo, carpetMat));
  carpet.frustumCulled = false;
  const roll = add(new Mesh(own(new CylinderGeometry(1, 1, CW, 40)), carpetMat));
  roll.rotation.z = Math.PI / 2;
  // brass stanchions with velvet ropes along the carpet in the foyer
  const stanchions = new InstancedMesh(own(new CylinderGeometry(0.05, 0.07, 1, 12)), brassMat, 2 * 10);
  for (let k = 0; k < 10; k++) for (const sx of [-1, 1]) { dummy.position.set(sx * 1.7, TOP + 0.5, 104 - k * 6.4); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); stanchions.setMatrixAt(k * 2 + (sx > 0 ? 1 : 0), dummy.matrix); }
  add(stanchions);

  // =====================================================================================
  // beams, dust, flashes
  // =====================================================================================
  const beamGeo = own(new CylinderGeometry(0.06, 1, 1, 48, 1, true));
  beamGeo.translate(0, -0.5, 0);
  const beams = spots.map((sp) => {
    const mat = own(new ShaderMaterial({
      vertexShader: beamVertex, fragmentShader: beamFragment, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
      uniforms: { uColor: { value: sp.col }, uI: { value: 0 }, uTime: time },
    }));
    const m = add(new Mesh(beamGeo, mat));
    m.frustumCulled = false;
    return m;
  });
  const down = new Vector3(0, -1, 0), dir = new Vector3();
  const stagePool = add(new Mesh(own(new CircleGeometry(1, 48)), own(new MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: AdditiveBlending, color: 0 }))));
  stagePool.rotation.x = -Math.PI / 2; stagePool.position.set(0, STAGE_Y + 0.02, -3.2);

  let seed = 23;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const dustCount = 2800;
  const dPos = new Float32Array(dustCount * 3), dSeed = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) { dPos.set([(rnd() - 0.5) * 30, rnd() * 11, -12 + rnd() * 48], i * 3); dSeed[i] = rnd(); }
  const dustGeo = own(new BufferGeometry());
  dustGeo.setAttribute('position', new BufferAttribute(dPos, 3));
  dustGeo.setAttribute('aSeed', new BufferAttribute(dSeed, 1));
  const dustMat = own(new ShaderMaterial({
    vertexShader: dustVertex, fragmentShader: dustFragment, transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { ...spotU, uTime: time, uSize: { value: 60 } },
  }));
  const dust = add(new Points(dustGeo, dustMat));
  dust.frustumCulled = false;

  const flashCount = 90;
  const fPos = new Float32Array(flashCount * 3), fSeed = new Float32Array(flashCount);
  for (let i = 0; i < flashCount; i++) {
    const pit = i < 26;                                   // the press pit in front of the stage, then the seats
    const z = pit ? 3.6 + rnd() * 1.6 : ROW0 + rnd() * (ROWS * ROW_GAP);
    const x = pit ? (rnd() - 0.5) * 18 : (rnd() > 0.5 ? 1 : -1) * (AISLE + rnd() * SEATS * SEAT_GAP);
    fPos.set([x, floorAt(z) + 1.3 + rnd() * 0.5, z], i * 3);
    fSeed[i] = rnd();
  }
  const flashGeo = own(new BufferGeometry());
  flashGeo.setAttribute('position', new BufferAttribute(fPos, 3));
  flashGeo.setAttribute('aSeed', new BufferAttribute(fSeed, 1));
  const flashMat = own(new ShaderMaterial({
    vertexShader: flashVertex, fragmentShader: flashFragment, transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: time, uSize: { value: 300 }, uOn: { value: 0 }, uColor: { value: cIvory.clone().lerp(cWarm, 0.15) } },
  }));
  const flashes = add(new Points(flashGeo, flashMat));
  flashes.frustumCulled = false;

  // =====================================================================================
  // the badge, hung in front of the camera (camera space)
  // =====================================================================================
  const badge = new Group();
  camera.add(badge);
  const BW = 0.54, BH = 0.8, ROPE_N = 15, ROPE_LEN = 1.05;
  const roundRect = (w: number, h: number, r: number) => {
    const sh = new Shape();
    sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2);
    sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return sh;
  };
  const card = new Group();
  badge.add(card);
  const cardShape = roundRect(BW, BH, 0.035);
  const body = own(new ExtrudeGeometry(cardShape, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 8 }));
  body.translate(0, -BH / 2, -0.004);
  const plastic = own(new MeshPhysicalMaterial({ color: cIvory.clone().multiplyScalar(0.9), roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.8 }));
  card.add(new Mesh(body, plastic));
  const faceGeo = own(new ShapeGeometry(cardShape, 8));
  { const uv = faceGeo.attributes.uv, pos = faceGeo.attributes.position; for (let k = 0; k < uv.count; k++) uv.setXY(k, pos.getX(k) / BW + 0.5, pos.getY(k) / BH + 0.5); }
  faceGeo.translate(0, -BH / 2, 0);
  const frontMat = own(new MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.7 }));
  const backMat = own(new MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.7 }));
  const face = new Mesh(faceGeo, frontMat); face.position.z = 0.0065;
  const backFace = new Mesh(faceGeo, backMat); backFace.position.z = -0.0065; backFace.rotation.y = Math.PI;   // reads correctly from behind
  card.add(face, backFace);
  const scanMat = own(new MeshBasicMaterial({ color: cAmber.clone().lerp(cIvory, 0.3).multiplyScalar(5), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
  const scanLine = new Mesh(own(new PlaneGeometry(1, 1)), scanMat);
  card.add(scanLine);
  let qr = { y0: 0.62, y1: 0.92, w: 0.45 };
  const faces = badgeTextures(host, gala.lang).then((tx) => {
    own(tx.front); own(tx.back);
    frontMat.map = tx.front; backMat.map = tx.back; frontMat.needsUpdate = backMat.needsUpdate = true;
    qr = tx.qr;
  });
  const clip = new Group();
  clip.add(new Mesh(own(new BoxGeometry(0.05, 0.07, 0.014)), alumMat));
  const clipRing = new Mesh(own(new TorusGeometry(0.022, 0.005, 8, 24)), alumMat);
  clipRing.position.y = 0.05; clip.add(clipRing);
  badge.add(clip);
  // the lanyard: a strap that always turns its face to the camera
  const strapPos = new Float32Array(ROPE_N * 2 * 3), strapUv = new Float32Array(ROPE_N * 2 * 2), strapIdx: number[] = [];
  for (let k = 0; k < ROPE_N; k++) { strapUv.set([0, k / (ROPE_N - 1), 1, k / (ROPE_N - 1)], k * 4); if (k < ROPE_N - 1) { const a = k * 2; strapIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const strapGeo = own(new BufferGeometry());
  const strapAttr = new BufferAttribute(strapPos, 3).setUsage(DynamicDrawUsage);
  strapGeo.setAttribute('position', strapAttr);
  strapGeo.setAttribute('uv', new BufferAttribute(strapUv, 2));
  strapGeo.setIndex(strapIdx);
  const strapCanvas = document.createElement('canvas'); strapCanvas.width = 16; strapCanvas.height = 4;
  { const g = strapCanvas.getContext('2d')!; g.fillStyle = cssColor('--color-velvet', host); g.fillRect(0, 0, 16, 4); g.fillStyle = cssColor('--color-accent', host); g.fillRect(7, 0, 2, 4); }
  const strapTex = own(new CanvasTexture(strapCanvas));
  strapTex.colorSpace = SRGBColorSpace; strapTex.magFilter = LinearFilter;
  const strap = new Mesh(strapGeo, own(new MeshStandardMaterial({ map: strapTex, roughness: 0.8, side: DoubleSide })));
  strap.frustumCulled = false;
  badge.add(strap);
  const badgeKey = new PointLight(cWarm.clone().lerp(cIvory, 0.5), 4, 6, 2);
  badgeKey.position.set(0.9, 0.9, -1.6);
  camera.add(badgeKey);
  // rope state (camera space)
  const rope = Array.from({ length: ROPE_N }, () => ({ p: new Vector3(), o: new Vector3() }));
  const anchor = new Vector3();
  let ropeReady = false, grabbed = false, wasDown = false;
  const grabOff = new Vector3(), grabTo = new Vector3();
  let cardAngle = 0, cardSpin = 0, cardTwist = 0, cardTwistV = 0;

  bake();

  // =====================================================================================
  // the pass that puts the world on the shared canvas
  // =====================================================================================
  let target: WebGLRenderTarget | null = null;
  const scene = new Scene();
  const flatCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const finish = own(new ShaderMaterial({
    vertexShader: finishVertex, fragmentShader: finishFragment, depthTest: false, depthWrite: false,
    uniforms: {
      tScene: { value: null as Texture | null }, uRes: { value: new Vector2(1, 1) }, uVeil: { value: 0 }, uTime: time,
      uExposure: { value: 1.0 }, uBloom: { value: 1.0 }, uDim: { value: 1 }, uNavy: { value: navy },
    },
  }));
  const screen = new Mesh(own(new PlaneGeometry(2, 2)), finish);
  screen.frustumCulled = false;
  scene.add(screen);

  // =====================================================================================
  // state
  // =====================================================================================
  let ready = false, width = 1, height = 1, aspect = 1;
  const pointer = { x: 0, y: 0, seen: false };
  const onPointer = (ev: PointerEvent) => {
    const r = host.getBoundingClientRect();
    pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -(((ev.clientY - r.top) / r.height) * 2 - 1);
    pointer.seen = true;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  const camPos = new Vector3(...NODES.hero0.p), camAim = new Vector3(...NODES.hero0.t);
  const cam = { fov: NODES.hero0.fov, shift: 0, dim: 1 };
  const goal = { p: new Vector3(), t: new Vector3(), fov: 40, shift: 0, dim: 1 };
  const a3 = new Vector3(), tmp = new Vector3(), ndc = new Vector3(), ray = new Ray();
  let firstFrame = true, openNow = 0, openVel = 0, carpetNow = 0, ledNow = 0, flashNow = 0, wavesNow = 0, beamsNow = 0, badgeNow = 0;

  const blend = (A: Node, B: Node, t: number) => {
    goal.p.set(...A.p).lerp(a3.set(...B.p), t);
    goal.t.set(...A.t).lerp(a3.set(...B.t), t);
    goal.fov = mix(A.fov, B.fov, t); goal.shift = mix(A.shift, B.shift, t); goal.dim = mix(A.dim, B.dim, t);
  };
  const aim = () => {
    const K = NODES;
    if (gala.poster === 'curtain') { blend(K.hero0, K.hero0, 0); return; }
    if (gala.poster === 'hall') { blend(K.heroWide, K.heroWide, 0); return; }
    const shot = clamp(gala.shot, 0, 10.999), i = Math.floor(shot), f = shot - i, sf = smooth(f);
    switch (i) {
      case 0: if (f < 0.5) blend(K.hero0, K.heroWide, smooth(span(f, 0.05, 0.5))); else blend(K.heroWide, K.hero1, smooth(span(f, 0.5, 1))); break;
      case 1: blend(K.svc0, K.svc1, sf); break;
      case 2: blend(K.svc1, K.expo, smooth(span(f, 0, 0.3))); break;
      case 3: blend(K.arr0, K.arr1, sf); if (f < 0.25) blend(K.expo, K.arr0, smooth(f / 0.25)); break;
      case 4: if (f < 0.16) blend(K.arr1, K.door, smooth(f / 0.16)); else blend(K.door, K.reg, smooth(span(f, 0.16, 0.4))); break;
      case 5: if (f < 0.5) blend(K.int0, K.int0, 0); else if (f < 0.62) blend(K.int0, K.int1, smooth(span(f, 0.5, 0.62))); else blend(K.int1, K.int2, smooth(span(f, 0.62, 1))); break;
      case 6: blend(K.int2, K.types, smooth(span(f, 0, 0.18))); break;
      case 7: blend(K.types, K.roof, smooth(span(f, 0, 0.4))); break;
      case 8: blend(K.roof, K.how0, smooth(span(f, 0, 0.2))); if (f > 0.2) blend(K.how0, K.how1, smooth(span(f, 0.2, 1))); break;
      case 9: blend(K.how1, K.faq, smooth(span(f, 0, 0.4))); break;
      default: blend(K.faq, K.call, smooth(span(f, 0, 0.55))); break;
    }
    goal.p.x *= gala.side; goal.t.x *= gala.side;
  };

  /** where every light points this frame (goals; eased in update) */
  const rig = (t: number) => {
    const shot = gala.shot, open = openNow, inHall = shot < 1 || shot >= 4;
    // follow spot: the curtain while it is closed / closing, the turntable for the event types
    const sp0 = spots[0];
    sp0.gPos.copy(FOLLOW);
    if (shot >= 6 && shot < 7) { sp0.gAim.set(0, STAGE_Y + 1.2, TABLE.z + 2.6); sp0.gCos = Math.cos(0.075); sp0.gI = 1.3; }
    else { sp0.gAim.set(0, 5.0, CURTAIN_Z); sp0.gCos = Math.cos(0.125 - 0.02 * gala.final); sp0.gI = (1 - open * 0.75) * (inHall ? 1.6 : 0); }
    // moving heads: off while the curtain is closed, then they sweep the stage and the house
    for (let k = 1; k <= 4; k++) {
      const sp = spots[k], ph = k * 1.7;
      sp.gPos.copy(HEADS[k - 1]);
      const sweepX = Math.sin(t * 0.33 + ph) * 7.5, sweepZ = -3 + Math.sin(t * 0.21 + ph * 2) * 9;
      sp.gAim.set(sweepX, sweepZ > 2.4 ? floorAt(sweepZ) : STAGE_Y, sweepZ);
      sp.gCos = Math.cos(0.105);
      sp.gI = inHall ? smooth(span(open, 0.25, 0.8)) * 1.0 : 0;
      if (shot >= 7 && shot < 8) sp.gI *= 0.25;
      if (gala.final > 0) {                              // finale: everything converges on the call
        const c = smooth(gala.final);
        sp.gAim.lerp(tmp.set((k % 2 ? -1 : 1) * 0.8 * (1 - c), 4.6, CURTAIN_Z + 0.4), c);
        sp.gCos = mix(sp.gCos, Math.cos(0.1), c);
        sp.gI = Math.max(sp.gI, c * 1.1);
      }
    }
    // the four beams of "under one roof": they find each other on the stage
    for (let k = 5; k < 9; k++) {
      const sp = spots[k], c = smooth(beamsNow), fin = smooth(gala.final);
      sp.gPos.copy(CORNERS[k - 5]);
      const wander = tmp.set(Math.sin(t * 0.4 + k) * 6, STAGE_Y, -3.2 + Math.cos(t * 0.3 + k * 2) * 4 + (k > 6 ? 10 : 0));
      sp.gAim.copy(wander).lerp(a3.set(0, STAGE_Y + 0.05, -3.2), c);
      if (fin > 0) sp.gAim.lerp(a3.set(0, 4.6, CURTAIN_Z + 0.4), fin);
      sp.gCos = Math.cos(0.075);
      sp.gI = Math.max(beamsNow * 2.2, fin * 0.9) * (inHall ? 1 : 0);
    }
    if (gala.poster === 'hall') { spots.forEach((sp, k) => { if (k >= 5) sp.gI = 0; }); }
  };

  const ropeRest = () => {
    for (let k = 0; k < ROPE_N; k++) { rope[k].p.set(anchor.x, anchor.y - (k / (ROPE_N - 1)) * ROPE_LEN, anchor.z); rope[k].o.copy(rope[k].p); }
    ropeReady = true;
  };

  const physics = (dt: number) => {
    const seg = ROPE_LEN / (ROPE_N - 1);
    const g = -6.5, keep = Math.exp(-1.4 * dt);          // gravity (scaled to the badge's size) · air drag per second
    for (let k = 1; k < ROPE_N; k++) {
      const r = rope[k];
      if (k === ROPE_N - 1 && grabbed) { r.o.copy(r.p); r.p.lerp(grabTo, 0.35); continue; }
      tmp.copy(r.p).sub(r.o).multiplyScalar(keep);
      r.o.copy(r.p);
      r.p.add(tmp);
      r.p.y += g * dt * dt * (k === ROPE_N - 1 ? 2.2 : 1);   // the card is heavier than the strap
    }
    rope[0].p.copy(anchor); rope[0].o.copy(anchor);
    for (let it = 0; it < 14; it++) {
      for (let k = 0; k < ROPE_N - 1; k++) {
        const a = rope[k].p, b = rope[k + 1].p;
        tmp.copy(b).sub(a);
        const d = tmp.length() || 1e-6, diff = (d - seg) / d;
        const wa = k === 0 ? 0 : 0.5, wb = k + 1 === ROPE_N - 1 && grabbed ? 0 : k === 0 ? 1 : 0.5;
        if (wa + wb === 0) continue;
        a.addScaledVector(tmp, diff * (wa / (wa + wb)));
        b.addScaledVector(tmp, -diff * (wb / (wa + wb)));
      }
      rope[0].p.copy(anchor);
    }
    // the card: a hinged pendulum under the clip, plus a twist round its own axis that a swing sets going
    const last = rope[ROPE_N - 1], prev = rope[ROPE_N - 3];
    const want = Math.atan2(last.p.x - prev.p.x, -(last.p.y - prev.p.y));
    cardSpin += (34 * (want - cardAngle) - 4.5 * cardSpin) * dt;
    cardAngle += cardSpin * dt;
    const vx = (last.p.x - last.o.x) / Math.max(dt, 1e-3);
    cardTwistV += (-9 * cardTwist - 1.1 * cardTwistV + vx * 5) * dt;
    cardTwist += cardTwistV * dt;
    cardTwist = clamp(cardTwist, -1.2, 1.2);
  };

  return {
    host,
    scene,
    camera: flatCamera,
    ready: () => ready,

    async prepare(renderer) {
      const hdr = await new HDRLoader().loadAsync('/media/img/dusk-env.hdr');
      hdr.mapping = EquirectangularReflectionMapping;
      const pmrem = new PMREMGenerator(renderer);
      const env = own(pmrem.fromEquirectangular(hdr));
      world.environment = env.texture;
      world.environmentIntensity = 0.22;
      pmrem.dispose();
      hdr.dispose();
      const float = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
      target = own(new WebGLRenderTarget(Math.max(width, 2), Math.max(height, 2), {
        type: float ? HalfFloatType : UnsignedByteType, depthBuffer: true, stencilBuffer: false, samples: 4,
        minFilter: LinearMipmapLinearFilter, magFilter: LinearFilter, generateMipmaps: true,
      }));
      finish.uniforms.tScene.value = target.texture;
      if (!float) finish.uniforms.uExposure.value = 1.25;
      for (let i = 0; i < BOOTHS; i++) placeBooth(i, 0, 0);
      // compile EVERY material now, the hidden ones too (badge with its printed face, waves, beams, floor plan):
      // three compiles only visible objects, and a first compile in the middle of the scroll stalls for seconds
      await faces;
      const hidden: Object3D[] = [];
      world.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
      await renderer.compileAsync(world, camera);
      hidden.forEach((o) => { o.visible = false; });
      ready = true;
    },

    update(t, deltaMs) {
      const dt = Math.min(deltaMs, 50) / 1000;
      time.value = t;
      const poster = gala.poster;
      const k = (tau: number) => (firstFrame || poster ? 1 : 1 - Math.exp(-dt / tau));

      // ---------- scroll state, eased a touch so nothing snaps ----------
      // the hero draws the curtain open; the call closes it again (scrubbed both ways)
      const openGoal = poster === 'curtain' ? 0 : poster === 'hall' ? 1 : gala.open * (1 - smooth(span(gala.final, 0.1, 0.9)));
      const before = openNow;
      openNow += (openGoal - openNow) * k(0.22);
      openVel += ((openNow - before) / Math.max(dt, 1e-3) - openVel) * k(0.12);
      carpetNow += ((poster ? 1 : gala.carpet) - carpetNow) * k(0.3);
      ledNow += ((poster === 'hall' ? 1 : gala.led) - ledNow) * k(0.5);
      // press flashes: the opening night, and the applause as the curtain closes at the end
      flashNow += ((poster ? 0 : Math.max(gala.flashes, smooth(span(gala.final, 0.55, 1)) * 0.7)) - flashNow) * k(0.4);
      wavesNow += (gala.waves - wavesNow) * k(0.4);
      beamsNow += (gala.beams - beamsNow) * k(0.35);
      badgeNow += (gala.badge - badgeNow) * k(0.5);
      curtainU.uOpen.value = openNow;
      curtainU.uVel.value = clamp(openVel, -1.5, 1.5);

      // ---------- carpet ----------
      const front = mix(CARPET_FROM, CARPET_TO, carpetNow);
      carpetFront.value = front;
      const r = Math.sqrt(0.012 + (0.36 * 0.36 - 0.012) * (1 - carpetNow));
      roll.scale.set(r, 1, r);
      roll.position.set(0, floorAt(front) + r, front - r * 0.2);
      roll.rotation.x = -(CARPET_FROM - front) / Math.max(r, 0.05);
      roll.visible = carpetNow < 0.999;

      // ---------- LED wall, flashes, waves ----------
      ledMat.uniforms.uI.value = 0.25 + ledNow * 1.1;
      ledLight.intensity = (0.2 + ledNow) * 90 * openNow;
      flashMat.uniforms.uOn.value = flashNow;
      waveMat.uniforms.uI.value = wavesNow;
      waves.visible = wavesNow > 0.01;
      glassMat.color.copy(cWarm).multiplyScalar(0.55 + wavesNow * 0.9);
      meet.intensity = smooth(beamsNow) * 60;
      stagePool.scale.setScalar(1.4 + beamsNow * 0.6);
      (stagePool.material as MeshBasicMaterial).color.copy(cWarm).multiplyScalar(beamsNow * 1.4);

      // ---------- the turntable brings event type n to the front (+z, toward the hall) ----------
      table.rotation.y += (-gala.turn * (Math.PI / 4) - table.rotation.y) * k(0.25);

      // ---------- seats: lit seats glow and warm up ----------
      lampMat.uniforms.uFill.value = poster === 'hall' ? 0.0 : gala.seats;
      const lit = Math.round(gala.seats * seatCount * 2) / (seatCount * 2);
      if (lit !== litSeats) {
        litSeats = lit;
        for (let i = 0; i < seatCount; i++) seats.setColorAt(i, e.setScalar(lampOrder[i] < lit ? 1.45 : 1));
        seats.instanceColor!.needsUpdate = true;
      }

      // ---------- the expo: floor plan, stands, hover ----------
      const expoOn = gala.shot > 0.6 && gala.shot < 4.6;
      plan.visible = expoOn;
      planMat.uniforms.uDraw.value = gala.plan;
      const anyLit = gala.booth >= 0 || gala.hover >= 0 ? 1 : 0;
      const dimBefore = dimOthers;
      dimOthers += (anyLit - dimOthers) * k(0.25);
      for (let i = 0; i < BOOTHS; i++) {
        const u = clamp(gala.booths - rank[i]);
        const label = LABELLED.indexOf(i);
        const want = label >= 0 && (label === gala.booth || label === gala.hover) ? 1 : 0;
        const litBefore = planLit[i];
        planLit[i] += (want - planLit[i]) * k(0.18);
        if (Math.abs(planLit[i] - want) < 0.003) planLit[i] = want;
        if (Math.abs(u - booths[i].u) > 1e-4 || planLit[i] !== litBefore || Math.abs(dimOthers - dimBefore) > 1e-4 || firstFrame) {
          booths[i].u = u; placeBooth(i, u, planLit[i]); boothsMoved = true;
        }
      }
      if (Math.abs(dimOthers - anyLit) < 0.003) dimOthers = anyLit;
      const standsOn = expoOn || gala.shot < 1.2;
      for (const m of [decks, posts, backs, sides, fascias, counters, screens, heads, pools]) {
        if (boothsMoved) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
        m.visible = standsOn;
      }
      boothsMoved = false;
      foyerLights.forEach((l) => { l.intensity = (26 + 70 * clamp(gala.booths / BOOTHS)) * (expoOn || gala.shot < 1.2 ? 1 : 0); });

      // ---------- camera ----------
      aim();
      const far = camPos.distanceTo(goal.p) > 30;            // a cut: it happens inside the dip into the dark
      const kc = firstFrame || poster || far ? 1 : 1 - Math.exp(-dt / 0.4);
      firstFrame = false;
      camPos.lerp(goal.p, kc); camAim.lerp(goal.t, kc);
      cam.fov += (goal.fov - cam.fov) * kc; cam.shift += (goal.shift - cam.shift) * kc; cam.dim += (goal.dim - cam.dim) * kc;
      const sway = poster ? 0 : 1, px = pointer.seen ? pointer.x : 0, py = pointer.seen ? pointer.y : 0;
      camera.position.set(
        camPos.x + (Math.sin(t * 0.19) * 0.08 + px * 0.25) * sway,
        camPos.y + (Math.sin(t * 0.15 + 1) * 0.05 + py * 0.12) * sway,
        camPos.z,
      );
      camera.lookAt(camAim);
      camera.fov = cam.fov * (gala.compact ? 1.18 : 1);
      camera.aspect = aspect;
      camera.setViewOffset(width, height, -cam.shift * gala.side * width, 0, width, height);
      camera.updateMatrixWorld();

      // pointer → the stand under it (expo only, labelled stands only)
      if (pointer.seen && gala.shot >= 2 && gala.shot < 3) {
        ndc.set(pointer.x, pointer.y, 0.5).unproject(camera);
        ray.origin.copy(camera.position); ray.direction.copy(ndc).sub(camera.position).normalize();
        let best = -1, bestD = Infinity;
        LABELLED.forEach((bi, li) => {
          const b = booths[bi];
          if (b.u < 0.6) return;
          box3.min.set(b.c.x - b.d / 2, b.c.y, b.c.z - b.w / 2); box3.max.set(b.c.x + b.d / 2, b.c.y + 3.2, b.c.z + b.w / 2);
          const hit = ray.intersectBox(box3, tmp);
          if (hit) { const d = hit.distanceTo(camera.position); if (d < bestD) { bestD = d; best = li; } }
        });
        if (best !== gala.hover) { gala.hover = best; gala.onHover?.(best); }
      } else if (gala.hover !== -1 && (gala.shot < 2 || gala.shot >= 3)) { gala.hover = -1; gala.onHover?.(-1); }

      // ---------- lights ----------
      rig(t);
      spots.forEach((sp, i) => {
        const kk = k(i === 0 ? 0.35 : 0.6);
        sp.pos.lerp(sp.gPos, kk); sp.aim.lerp(sp.gAim, kk);
        sp.cos += (sp.gCos - sp.cos) * kk; sp.i += (sp.gI - sp.i) * k(0.45);
        dir.copy(sp.aim).sub(sp.pos);
        const len = dir.length();
        dir.normalize();
        spotU.uSpotDir.value[i].copy(dir);
        spotU.uSpotCos.value[i] = sp.cos;
        spotU.uSpotI.value[i] = sp.i;
        const beam = beams[i];
        const rad = Math.tan(Math.acos(sp.cos)) * len;
        beam.position.copy(sp.pos);
        beam.quaternion.setFromUnitVectors(down, dir);
        beam.scale.set(rad, len * 1.02, rad);
        (beam.material as ShaderMaterial).uniforms.uI.value = sp.i * (i === 0 ? 0.55 : 1);
        beam.visible = sp.i > 0.01;
        if (i < 5) {
          const l = lamps[i];
          l.position.copy(sp.pos); l.target.position.copy(sp.aim); l.target.updateMatrixWorld();
          l.angle = Math.acos(sp.cos) * 1.05;
          l.intensity = sp.i * (i === 0 ? 2400 : 700);
        }
      });
      hemi.intensity = 0.06 + 0.1 * openNow;
      house.forEach((l) => { l.intensity = (16 + 40 * openNow) * (1 - gala.final * 0.7); });

      // ---------- the badge ----------
      badge.visible = badgeNow > 0.01;
      if (badge.visible) {
        const compact = gala.compact;
        const bx = compact ? 0 : gala.side * 0.92, depth = compact ? -3.5 : -3.1;
        anchor.set(bx, mix(4.2, compact ? 1.6 : 1.45, smooth(badgeNow)), depth);
        if (!ropeReady) ropeRest();
        // grab: press on the card (the scene's pad sends the pointer)
        const g = gala.grab;
        const halfH = Math.tan((camera.fov * Math.PI) / 360) * -depth, halfW = halfH * aspect;
        const px3 = g.x * halfW, py3 = g.y * halfH;
        if (g.down && !wasDown) {                                 // the pad lies over the badge only: a press takes the card
          grabbed = true;
          grabOff.set(rope[ROPE_N - 1].p.x - px3, clamp(rope[ROPE_N - 1].p.y - py3, -0.05, BH * 0.9), 0);
        }
        if (!g.down) grabbed = false;
        wasDown = g.down;
        if (grabbed) {
          grabTo.set(px3 + grabOff.x, py3 + grabOff.y, depth);
          tmp.copy(grabTo).sub(anchor);
          if (tmp.length() > ROPE_LEN * 0.98) grabTo.copy(anchor).addScaledVector(tmp.normalize(), ROPE_LEN * 0.98);
        }
        const steps = 4;
        for (let i = 0; i < steps; i++) physics(dt / steps);
        const last = rope[ROPE_N - 1].p;
        clip.position.copy(last); clip.rotation.set(0, cardTwist, cardAngle);
        card.position.set(last.x, last.y - 0.035, last.z);
        card.rotation.set(0.05, cardTwist, cardAngle);
        // the strap: two vertices per rope point, facing the camera
        for (let i = 0; i < ROPE_N; i++) {
          const a = rope[Math.max(i - 1, 0)].p, b = rope[Math.min(i + 1, ROPE_N - 1)].p, p = rope[i].p;
          tmp.copy(b).sub(a).normalize();
          const sx = -tmp.y * 0.03, sy = tmp.x * 0.03;
          strapPos.set([p.x - sx, p.y - sy, p.z, p.x + sx, p.y + sy, p.z], i * 6);
        }
        strapAttr.needsUpdate = true;
        strapGeo.computeBoundingSphere();
        // the line of light over the QR code
        const sc = gala.scan;
        const on = sc > 0.001 && sc < 0.999;
        scanMat.opacity = on ? 0.9 : 0;
        const yTop = -qr.y0 * BH, yBot = -qr.y1 * BH;
        scanLine.position.set(0, mix(yTop, yBot, sc), 0.008);
        scanLine.scale.set(qr.w * BW * 1.25, 0.006, 1);
        frontMat.emissive.copy(cAmber).multiplyScalar(sc >= 0.999 ? 0.04 : 0);
      } else ropeReady = false;

      // ---------- finish ----------
      finish.uniforms.uVeil.value = gala.veil;
      finish.uniforms.uDim.value = cam.dim;
      dustMat.uniforms.uSize.value = height * 0.05;
      flashMat.uniforms.uSize.value = height * 0.5;
      lampMat.uniforms.uSize.value = height * 0.1;
    },

    prerender(renderer: WebGLRenderer) {
      if (!target) return;
      const mapping = renderer.toneMapping;
      renderer.toneMapping = NoToneMapping;
      renderer.setRenderTarget(target);
      renderer.render(world, camera);
      renderer.setRenderTarget(null);
      renderer.toneMapping = mapping;
    },

    resize(w, h) {
      width = Math.max(w, 2); height = Math.max(h, 2);
      aspect = width / height;
      target?.setSize(width, height);
      finish.uniforms.uRes.value.set(width, height);
    },
    dispose() {
      window.removeEventListener('pointermove', onPointer);
      keep.forEach((d) => d.dispose());
      world.environment = null;
    },
  };
}
