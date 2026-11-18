/**
 * Act "justice" — Legal page: real-time 3D scales of justice, the thread of the page from top to bottom.
 * Everything is our own procedural geometry (lathe profiles, instanced chain links and columns): no model file.
 *
 *   world   the scales (aged brass, lit by a dusk HDRI from Poly Haven + a low sun), a stone on the left pan
 *           ("uncertainty"), six engraved bronze weights and one small gold one that fly onto the right pan,
 *           a colonnade leading to the scales, an apse of columns behind them, light shafts, dust
 *   physics the beam is a damped spring toward the angle its two loads give it; each pan is a pendulum that the
 *           beam, the pointer and every landing weight push around
 *   camera  one position per page section (bridge.justice.shot), a walk between the columns (walk)
 *
 * DEPTH: the shared canvas has no depth buffer, so the world is drawn into this act's own render target
 * (depth + MSAA, linear HDR) in `prerender`; `scene` is one full-screen pass that finishes the picture
 * (god rays, tone mapping, grain). One renderer, one context — see stage.ts.
 * Every device gets the full scene (quality policy): fluted columns, roughness/bump maps, 4× MSAA, god rays,
 * 4 physics steps per frame. Only the stage's render scale adapts.
 * The scene is decorative: every service, description and link lives in the DOM.
 */
import {
  AdditiveBlending, BackSide, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture,
  CircleGeometry, Color, CustomBlending, DirectionalLight, DoubleSide, EquirectangularReflectionMapping, FogExp2, Group,
  HalfFloatType, HemisphereLight, IcosahedronGeometry, InstancedMesh, LatheGeometry, LinearFilter, Matrix4, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, NoToneMapping, Object3D, OneFactor, OrthographicCamera, PerspectiveCamera,
  PlaneGeometry, PMREMGenerator, PointLight, Points, Quaternion, RepeatWrapping, RingGeometry, Scene, ShaderMaterial,
  SphereGeometry, SplineCurve, SRGBColorSpace, TorusGeometry, UnsignedByteType, Vector2, Vector3, WebGLRenderTarget,
  ZeroFactor, type Texture, type WebGLRenderer,
} from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import type { Act } from '../stage';
import { justice } from '../bridge';
import {
  dustFragment, dustVertex, finishFragment, finishVertex, shaftFragment, shaftVertex, skyFragment, skyVertex,
} from '../shaders/justice.glsl';
import { token } from './util';

const clamp = (v: number, a = 0, b = 1) => Math.min(Math.max(v, a), b);
const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------- the scales (world units ≈ metres ÷ 2; the floor is y = 0, the scales stand on the origin) ----------
const PIVOT_Y = 2.8;                 // where the beam turns
const ARM = 1.25;                    // half length of the beam
const HANG = 1.15;                   // hook → rim of a pan
const PAN_R = 0.5;
const PAN_FLOOR = -HANG - 0.105;     // inside of the bowl, in pan space
const MAX_TILT = 0.24;               // radians, with only the stone on the scales
const STONE = 1;                     // the load on the left pan
const MASS = [0.17, 0.16, 0.15, 0.14, 0.14, 0.12, 0.12];   // six services + the last small weight = the stone exactly
const FOV = 30;

// ---------- the hall ----------
const COL_H = 8.92, COL_X = 3.4, COL_GAP = 4, COL_Z0 = 8, COL_PAIRS = 10;
const APSE_R = 7.6, APSE = [-66, -44, -22, 0, 22, 44, 66];
const SUN = new Vector3(-0.62, 0.36, -0.7).normalize();

// ---------- camera: one node per moment (wide and compact screens) ----------
type Node = { p: [number, number, number]; t: [number, number, number]; shift: number; rise: number; dim: number };
const N = (p: Node['p'], t: Node['t'], shift = 0, rise = 0, dim = 1): Node => ({ p, t, shift, rise, dim });
const WIDE = {
  hero0: N([0.9, 2.0, 8.6], [0, 1.82, 0], 0.2),
  hero1: N([-1.7, 2.7, 6.4], [0, 1.78, 0], 0.2),
  svc: N([1.6, 1.62, 6.3], [0.3, 1.5, 0], 0.2),
  walk0: N([0, 1.75, 46.5], [0, 2.7, 0]),
  walk1: N([0, 2.0, 10.5], [0, 1.95, 0], 0.15, 0, 0.95),
  why: N([-2.1, 2.4, 7.6], [0, 1.8, 0], 0.23, 0, 0.5),
  how: N([0, 3.1, 11.5], [0, 1.1, 0], 0, 0, 0.4),
  faq: N([2.1, 2.1, 7.8], [0, 1.8, 0], 0.24, 0, 0.46),
  consult: N([0.5, 2.05, 7.7], [0, 1.9, 0], 0.21),
};
const COMPACT: typeof WIDE = {
  hero0: N([0.6, 2.2, 15.5], [0, 1.85, 0], 0, 0.2),
  hero1: N([-1.3, 2.7, 13.2], [0, 1.8, 0], 0, 0.22),
  svc: N([1.1, 1.9, 12.6], [0.15, 1.65, 0], 0, 0.25),
  walk0: N([0, 1.75, 46.5], [0, 2.7, 0]),
  walk1: N([0, 2.1, 14.5], [0, 1.9, 0], 0, 0.2, 0.9),
  why: N([-1.5, 2.4, 15], [0, 1.8, 0], 0, 0.2, 0.32),
  how: N([0, 3.0, 16], [0, 1.4, 0], 0, 0.2, 0.3),
  faq: N([1.5, 2.2, 15], [0, 1.8, 0], 0, 0.2, 0.32),
  consult: N([0.3, 2.2, 14.6], [0, 1.9, 0], 0, 0.23, 0.95),
};

const lathe = (pts: [number, number][], segments: number, spline = 0) => {
  let v = pts.map(([r, y]) => new Vector2(r, y));
  if (spline) v = new SplineCurve(v).getPoints(spline);
  return new LatheGeometry(v, segments);
};

/** value noise, tiled: the roughness / bump of old metal and stone */
function noiseTexture(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  let seed = 11;
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

/** the six icons, engraved: one atlas (3 × 2 cells) used as colour (dark grooves) and as bump */
function engravingAtlas(icons: string[]) {
  const cell = 256, canvas = document.createElement('canvas');
  canvas.width = cell * 3; canvas.height = cell * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgb(255 255 255)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgb(58 58 58)';
  ctx.lineCap = ctx.lineJoin = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.translate((i % 3) * cell + cell / 2, Math.floor(i / 3) * cell + cell / 2);
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, cell * 0.44, 0, Math.PI * 2); ctx.stroke();
    const k = (cell * 0.56) / 48;
    ctx.scale(k, k); ctx.translate(-24, -24);
    ctx.lineWidth = 2.5;
    if (icons[i]) ctx.stroke(new Path2D(icons[i]));
    ctx.restore();
  }
  const tex = new CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

export function createJusticeAct(host: HTMLElement): Act {
  const keep: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => { keep.push(x); return x; };

  // colours: every one starts from a semantic token (built-in materials want linear values)
  const lin = (c: Color) => c.clone().convertSRGBToLinear();
  const navy = token('--color-bg', host);
  const amber = token('--color-accent', host);
  const cNavy = lin(navy), cAmber = lin(amber);
  const cBrass = lin(token('--color-accent', host, ['--color-ink', 88]));
  const cBronze = lin(token('--color-accent', host, ['--color-bg', 62]));
  const cStone = lin(token('--color-ink', host, ['--color-accent', 86])).multiplyScalar(0.3);
  const cRock = lin(token('--color-ink-muted', host, ['--color-bg', 34]));
  const cFloor = lin(token('--color-bg', host, ['--color-ink', 93]));
  const cSunlight = lin(token('--color-accent', host, ['--color-ink', 62]));
  const cHorizon = lin(token('--color-bg', host, ['--color-accent', 84]));

  // =====================================================================================
  // world
  // =====================================================================================
  const world = new Scene();
  world.fog = new FogExp2(cNavy.clone().lerp(cHorizon, 0.5).multiplyScalar(0.55), 0.021);
  const camera = new PerspectiveCamera(FOV, 1, 0.3, 400);

  const noise = own(noiseTexture(256));
  const metal = (color: Color, roughness: number, bump = 0.012) => {
    const m = own(new MeshStandardMaterial({ color, metalness: 1, roughness, envMapIntensity: 0.9 }));
    m.roughnessMap = noise; m.bumpMap = noise; m.bumpScale = bump; m.roughness = roughness * 1.5;
    return m;
  };
  const brass = metal(cBrass, 0.3);
  const bronze = metal(cBronze, 0.42, 0.02);
  const gold = own(new MeshStandardMaterial({ color: cAmber, metalness: 1, roughness: 0.18, envMapIntensity: 1.5, emissive: cAmber, emissiveIntensity: 0.12 }));
  const stone = own(new MeshStandardMaterial({ color: cStone, metalness: 0, roughness: 0.9, envMapIntensity: 0.5 }));
  if (noise) { stone.bumpMap = noise; stone.bumpScale = 0.05; }
  const rock = own(new MeshStandardMaterial({ color: cRock, metalness: 0, roughness: 0.96, envMapIntensity: 0.35, flatShading: true }));
  const floorMat = own(new MeshStandardMaterial({ color: cFloor.clone().multiplyScalar(0.6), metalness: 0, roughness: 0.36, envMapIntensity: 0.3 }));

  // ---------- lights ----------
  const sun = new DirectionalLight(cSunlight, 2.6);
  sun.position.copy(SUN).multiplyScalar(30);
  const fill = new HemisphereLight(lin(token('--color-focus', host, ['--color-ink', 40])), cNavy, 0.16);
  const rim = new PointLight(cAmber, 46, 30);
  rim.position.set(2.8, 3.6, -3.2);
  const lamp = new PointLight(cSunlight, 0, 9);          // follows the pointer
  world.add(sun, fill, rim, lamp);

  // ---------- sky ----------
  const skyMat = own(new ShaderMaterial({
    vertexShader: skyVertex, fragmentShader: skyFragment, side: BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: {
      uZenith: { value: cNavy.clone().multiplyScalar(0.55) }, uHorizon: { value: cNavy.clone().lerp(cHorizon, 0.45).multiplyScalar(0.42) },
      uGlow: { value: cSunlight }, uSunDir: { value: SUN },
    },
  }));
  const sky = new Mesh(own(new SphereGeometry(200, 32, 16)), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  world.add(sky);

  // ---------- floor + plinth ----------
  const floor = new Mesh(own(new PlaneGeometry(170, 190)), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 30;
  if (noise) { floorMat.roughnessMap = noise; floorMat.roughness = 0.62; }
  world.add(floor);
  const plinth = new Mesh(own(lathe([[0, 0], [1.6, 0], [1.6, 0.13], [1.53, 0.18], [0, 0.18]], 72)), stone);
  world.add(plinth);
  // contact shadow: a soft dark disc (no shadow maps on the shared renderer)
  const blobCanvas = document.createElement('canvas');
  blobCanvas.width = blobCanvas.height = 128;
  const bctx = blobCanvas.getContext('2d')!;
  const grad = bctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgb(0 0 0 / 0.72)'); grad.addColorStop(0.55, 'rgb(0 0 0 / 0.3)'); grad.addColorStop(1, 'rgb(0 0 0 / 0)');
  bctx.fillStyle = grad; bctx.fillRect(0, 0, 128, 128);
  const blobTex = own(new CanvasTexture(blobCanvas));
  const blobMat = own(new MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, fog: false }));
  const blobGeo = own(new PlaneGeometry(1, 1));
  const blob = (x: number, y: number, z: number, size: number) => {
    const m = new Mesh(blobGeo, blobMat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.scale.setScalar(size);
    world.add(m);
    return m;
  };
  blob(0, 0.012, 0, 5.4);
  blob(0, 0.192, 0, 2.1);
  const panShadow = [blob(-ARM, 0.194, 0, 1.25), blob(ARM, 0.194, 0, 1.25)];

  // ---------- the scales ----------
  const seg = 64;
  const stand = new Mesh(own(lathe([
    [0, 0.18], [0.6, 0.18], [0.66, 0.21], [0.64, 0.26], [0.52, 0.3], [0.5, 0.36], [0.34, 0.41], [0.22, 0.5], [0.13, 0.62],
    [0.085, 0.8], [0.1, 0.9], [0.16, 0.98], [0.1, 1.07], [0.07, 1.2], [0.055, 1.7], [0.06, 2.3], [0.085, 2.4], [0.13, 2.48],
    [0.085, 2.56], [0.055, 2.64], [0.05, 2.74], [0.085, 2.8], [0.05, 2.86], [0, 2.87],
  ], seg, 150)), brass);
  world.add(stand);

  const beam = new Group();                              // turns around z at the pivot
  beam.position.set(0, PIVOT_Y, 0.11);
  world.add(beam);
  const armGeo = own(lathe([
    [0, -ARM - 0.05], [0.04, -ARM - 0.03], [0.058, -ARM], [0.036, -ARM + 0.06], [0.03, -0.9], [0.05, -0.62], [0.036, -0.34],
    [0.05, -0.17], [0.1, -0.06], [0.115, 0], [0.1, 0.06], [0.05, 0.17], [0.036, 0.34], [0.05, 0.62], [0.03, 0.9],
    [0.036, ARM - 0.06], [0.058, ARM], [0.04, ARM + 0.03], [0, ARM + 0.05],
  ], 28, 120));
  armGeo.rotateZ(Math.PI / 2);
  // the needle above the pivot shows the balance, like on a real pair of scales
  const needle = own(lathe([[0, 0.08], [0.05, 0.1], [0.028, 0.18], [0.018, 0.36], [0.05, 0.44], [0.06, 0.5], [0.03, 0.58], [0, 0.66]], 24, 60));
  const boss = own(new TorusGeometry(0.13, 0.022, 10, 40));
  beam.add(new Mesh(armGeo, brass), new Mesh(needle, brass), new Mesh(boss, brass));

  // a pan with its hook and three chains; local origin = the point it hangs from
  const linkGeo = own(new TorusGeometry(0.023, 0.0062, 6, 12));
  const ringGeo = own(new TorusGeometry(0.05, 0.011, 8, 24));
  const bowlGeo = own(lathe([
    [0, -HANG - 0.122], [0.3, -HANG - 0.12], [0.42, -HANG - 0.105], [0.475, -HANG - 0.06], [PAN_R, -HANG], [PAN_R + 0.022, -HANG + 0.014],
    [PAN_R, -HANG + 0.008], [0.465, -HANG - 0.05], [0.41, -HANG - 0.094], [0.3, PAN_FLOOR], [0, PAN_FLOOR],
  ], seg));
  const makePan = () => {
    const g = new Group();
    const ring = new Mesh(ringGeo, brass);
    ring.position.y = -0.06;
    g.add(ring, new Mesh(bowlGeo, brass));
    const top = new Vector3(0, -0.11, 0), dir = new Vector3(), q = new Quaternion(), roll = new Quaternion();
    const m = new Matrix4(), xAxis = new Vector3(1, 0, 0), s = new Vector3(1.32, 1, 1), p = new Vector3();
    const per = 30, links = new InstancedMesh(linkGeo, brass, per * 3);
    for (let c = 0; c < 3; c++) {
      const a = (c / 3) * Math.PI * 2 + Math.PI / 6;
      const end = new Vector3(Math.cos(a) * (PAN_R - 0.01), -HANG + 0.012, Math.sin(a) * (PAN_R - 0.01));
      dir.copy(end).sub(top);
      const len = dir.length();
      dir.normalize();
      q.setFromUnitVectors(xAxis, dir);
      for (let i = 0; i < per; i++) {
        roll.setFromAxisAngle(xAxis, i % 2 ? Math.PI / 2 : 0);
        p.copy(top).addScaledVector(dir, ((i + 0.5) / per) * len);
        links.setMatrixAt(c * per + i, m.compose(p, q.clone().multiply(roll), s));
      }
    }
    g.add(links);
    world.add(g);
    return g;
  };
  const pans = [makePan(), makePan()];                   // 0 = left (the stone) · 1 = right (the weights)

  // the stone on the left pan: an irregular rock
  const rockGeo = own(new IcosahedronGeometry(0.3, 2));
  {
    const pos = rockGeo.attributes.position, v = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = Math.sin(v.x * 9.1 + 1.3) * Math.sin(v.y * 7.3 + 0.4) * Math.sin(v.z * 8.2 + 2.1);
      v.multiplyScalar(1 + n * 0.32).multiply(new Vector3(1.12, 0.74, 0.96));
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    rockGeo.computeVertexNormals();
  }
  const rockMesh = new Mesh(rockGeo, rock);
  rockMesh.position.set(0.02, PAN_FLOOR + 0.19, 0.01);
  rockMesh.rotation.set(0.2, 0.7, -0.1);
  pans[0].add(rockMesh);

  // ---------- the weights ----------
  const atlas = own(engravingAtlas(justice.icons));
  atlas.colorSpace = SRGBColorSpace;
  const faceMat = own(new MeshStandardMaterial({ color: cBronze.clone().multiplyScalar(1.5), metalness: 1, roughness: 0.34, map: atlas, bumpMap: atlas, bumpScale: 0.6, envMapIntensity: 1.2 }));
  const goldFace = own(new MeshStandardMaterial({ color: cAmber, metalness: 1, roughness: 0.14, envMapIntensity: 1.6, emissive: cAmber, emissiveIntensity: 0.16 }));
  type Weight = { obj: Group; h: number; mass: number; home: Vector3; slot: Vector3; u: number; on: boolean };
  const weights: Weight[] = MASS.map((mass, i) => {
    const last = i === 6;
    const R = last ? 0.078 : 0.09 + mass * 0.17, h = last ? 0.07 : 0.085 + mass * 0.2;
    const body = own(lathe([
      [0, 0], [R * 0.9, 0], [R, 0.014], [R, h * 0.4], [R * 0.93, h * 0.47], [R * 0.93, h * 0.53], [R, h * 0.6], [R, h - 0.014],
      [R * 0.94, h], [R * 0.82, h], [R * 0.8, h - 0.01], [0, h - 0.01],
    ], 48));
    const face = own(new CircleGeometry(R * 0.8, 48));
    face.rotateX(-Math.PI / 2);
    if (!last) {                                          // its own cell of the atlas
      const uv = face.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, (uv.getX(k) + (i % 3)) / 3, (uv.getY(k) + (1 - Math.floor(i / 3))) / 2);
    }
    const top = new Mesh(face, last ? goldFace : faceMat);
    top.position.y = h - 0.009;
    const obj = new Group();
    obj.add(new Mesh(body, last ? gold : bronze), top);
    world.add(obj);
    // home: an arc on the plinth, in front of the scales · slot: its place on the right pan
    const a = last ? 0 : ((-50 + i * 20) * Math.PI) / 180, r = last ? 1.38 : 1.14;
    const home = new Vector3(Math.sin(a) * r, 0.18, Math.cos(a) * r);
    const ring = ((i - 1) / 5) * Math.PI * 2 + 0.5;
    const slot = i === 0 ? new Vector3(0, PAN_FLOOR, 0)
      : last ? new Vector3(0, PAN_FLOOR + 0.085 + MASS[0] * 0.2, 0)
      : new Vector3(Math.cos(ring) * 0.272, PAN_FLOOR + 0.002, Math.sin(ring) * 0.272);
    return { obj, h, mass, home, slot, u: 0, on: false };
  });

  // the ring of light a landing weight sends out
  const waveMat = own(new MeshBasicMaterial({ color: cSunlight, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: false }));
  const wave = new Mesh(own(new RingGeometry(0.86, 1, 56)), waveMat);
  wave.rotation.x = -Math.PI / 2;
  world.add(wave);
  let waveT = 1;

  // ---------- the hall: a colonnade toward the scales and an apse behind them ----------
  const colSeg = 80;
  const shaft: [number, number][] = [[0.64, 0], [0.64, 0.12], [0.57, 0.16], [0.62, 0.25], [0.53, 0.31], [0.5, 0.38]];
  for (let i = 0; i <= 12; i++) { const t = i / 12; shaft.push([0.47 - 0.085 * Math.pow(t, 1.7), 0.42 + t * 7.86]); }
  shaft.push([0.4, 8.33], [0.43, 8.4], [0.56, 8.6], [0.6, 8.7], [0, 8.7]);
  const colGeo = own(lathe(shaft, colSeg));
  {                                                       // flutes: carve the shaft
    const pos = colGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y < 0.42 || y > 8.28) continue;
      const k = 1 - 0.045 * Math.pow(0.5 + 0.5 * Math.cos(20 * Math.atan2(z, x)), 1.5);
      pos.setXYZ(i, x * k, y, z * k);
    }
    colGeo.computeVertexNormals();
  }
  const spots: [number, number, number][] = [];           // x, z, turn
  for (let j = 0; j < COL_PAIRS; j++) for (const sx of [-1, 1]) spots.push([sx * COL_X, COL_Z0 + j * COL_GAP, 0]);
  for (const deg of APSE) { const a = (deg * Math.PI) / 180; spots.push([Math.sin(a) * APSE_R, -Math.cos(a) * APSE_R, -a]); }
  const columns = new InstancedMesh(colGeo, stone, spots.length);
  const abacus = new InstancedMesh(own(new BoxGeometry(1.32, 0.22, 1.32)), stone, spots.length);
  const dummy = new Object3D();
  spots.forEach(([x, z, turn], i) => {
    dummy.position.set(x, 0, z); dummy.rotation.set(0, turn, 0); dummy.updateMatrix();
    columns.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 8.81; dummy.updateMatrix();
    abacus.setMatrixAt(i, dummy.matrix);
  });
  columns.frustumCulled = abacus.frustumCulled = false;
  world.add(columns, abacus);
  const lintelGeo = own(new BoxGeometry(1.16, 1, COL_GAP * (COL_PAIRS - 1) + 1.6));
  for (const sx of [-1, 1]) {
    const lintel = new Mesh(lintelGeo, stone);
    lintel.position.set(sx * COL_X, COL_H + 0.5, COL_Z0 + (COL_GAP * (COL_PAIRS - 1)) / 2);
    world.add(lintel);
  }
  const arc = ((APSE.at(-1)! - APSE[0] + 10) * Math.PI) / 180;
  const ringProfile = [[APSE_R - 0.58, COL_H], [APSE_R + 0.58, COL_H], [APSE_R + 0.58, COL_H + 1], [APSE_R - 0.58, COL_H + 1], [APSE_R - 0.58, COL_H]].map(([r, y]) => new Vector2(r, y));
  const apseRing = new Mesh(own(new LatheGeometry(ringProfile, 48, Math.PI - arc / 2, arc)), stone);
  world.add(apseRing);

  // ---------- light shafts through the gaps, and their pools on the floor ----------
  const L = SUN.clone().negate();                         // the way the light travels
  const reach = COL_H / -L.y;                             // how far a ray from the top of a gap travels before the floor
  const sPos: number[] = [], sUv: number[] = [], sKind: number[] = [], sSeed: number[] = [], sIdx: number[] = [];
  const quad = (a: Vector3, b: Vector3, c: Vector3, d: Vector3, kind: number, seed: number) => {   // a→b across, a→d along
    const n = sPos.length / 3;
    for (const [v, u, w] of [[a, 0, 0], [b, 1, 0], [c, 1, 1], [d, 0, 1]] as [Vector3, number, number][]) {
      sPos.push(v.x, v.y, v.z); sUv.push(u, w); sKind.push(kind); sSeed.push(seed);
    }
    sIdx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  };
  const gaps: [Vector3, Vector3][] = [];                  // [middle of the gap on the floor, direction across it]
  for (let j = 0; j < COL_PAIRS - 1; j++) gaps.push([new Vector3(-COL_X, 0, COL_Z0 + (j + 0.5) * COL_GAP), new Vector3(0, 0, 1)]);
  for (let k = 0; k < 3; k++) {                           // the gaps of the apse on the sun's side
    const a = (((APSE[k] + APSE[k + 1]) / 2) * Math.PI) / 180;
    gaps.push([new Vector3(Math.sin(a) * APSE_R, 0, -Math.cos(a) * APSE_R), new Vector3(Math.cos(a), 0, Math.sin(a))]);
  }
  const up = new Vector3(0, 1, 0);
  gaps.forEach(([mid, across], g) => {
    const half = 1.45, far = L.clone().multiplyScalar(reach);
    for (const off of [-0.9, 0, 0.9]) {      // a few sheets per gap read as a volume
      const base = mid.clone().addScaledVector(across, off);
      const a = base.clone().addScaledVector(up, COL_H * 0.98), b = base.clone().addScaledVector(up, 0.4);
      quad(a, b, b.clone().addScaledVector(L, reach * 0.9), a.clone().add(far), 0, g * 0.37 + off);
    }
    const p0 = mid.clone().addScaledVector(across, -half).setY(0.02), p1 = mid.clone().addScaledVector(across, half).setY(0.02);
    const flat = new Vector3(L.x, 0, L.z).multiplyScalar(reach);
    quad(p0, p1, p1.clone().add(flat), p0.clone().add(flat), 1, g * 0.61);
  });
  const shaftGeo = own(new BufferGeometry());
  shaftGeo.setAttribute('position', new BufferAttribute(new Float32Array(sPos), 3));
  shaftGeo.setAttribute('uv', new BufferAttribute(new Float32Array(sUv), 2));
  shaftGeo.setAttribute('aKind', new BufferAttribute(new Float32Array(sKind), 1));
  shaftGeo.setAttribute('aSeed', new BufferAttribute(new Float32Array(sSeed), 1));
  shaftGeo.setIndex(sIdx);
  // additive on colour, alpha untouched: the alpha of the target stays the sky mask
  const glowBlend = { blending: CustomBlending, blendSrc: OneFactor, blendDst: OneFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor, depthWrite: false, transparent: true } as const;
  const time = { value: 0 };
  const shaftMat = own(new ShaderMaterial({
    vertexShader: shaftVertex, fragmentShader: shaftFragment, side: DoubleSide, ...glowBlend,
    uniforms: { uColor: { value: cSunlight }, uTime: time, uGain: { value: 1 } },
  }));
  const shafts = new Mesh(shaftGeo, shaftMat);
  shafts.frustumCulled = false;
  shafts.renderOrder = 5;
  world.add(shafts);

  // ---------- dust in the light ----------
  const dustCount = 1500;
  const dPos = new Float32Array(dustCount * 3), dSeed = new Float32Array(dustCount);
  let seed = 23;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < dustCount; i++) {
    const near = i < dustCount * 0.45;                    // almost half of it floats around the scales
    dPos.set([(rnd() - 0.5) * (near ? 7 : 9), rnd() * 7.5, near ? (rnd() - 0.4) * 9 : 6 + rnd() * 42], i * 3);
    dSeed[i] = rnd();
  }
  const dustGeo = own(new BufferGeometry());
  dustGeo.setAttribute('position', new BufferAttribute(dPos, 3));
  dustGeo.setAttribute('aSeed', new BufferAttribute(dSeed, 1));
  const dustMat = own(new ShaderMaterial({
    vertexShader: dustVertex, fragmentShader: dustFragment, ...glowBlend,
    uniforms: { uColor: { value: cSunlight.clone().multiplyScalar(1.6) }, uTime: time, uSize: { value: 60 } },
  }));
  const dust = new Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  dust.renderOrder = 6;
  world.add(dust);

  // =====================================================================================
  // the pass that puts the world on the shared canvas
  // =====================================================================================
  let target: WebGLRenderTarget | null = null;
  const scene = new Scene();
  const flatCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const finish = own(new ShaderMaterial({
    vertexShader: finishVertex, fragmentShader: finishFragment, depthTest: false, depthWrite: false,
    defines: { RAYS: 28 },
    uniforms: {
      tScene: { value: null as Texture | null }, uSun: { value: new Vector2(0.3, 0.6) }, uRes: { value: new Vector2(1, 1) },
      uSunOn: { value: 0 }, uVeil: { value: 0 }, uDim: { value: 1 }, uTime: time, uExposure: { value: 1.0 },
      uWarm: { value: token('--color-accent', host, ['--color-ink', 70]) }, uNavy: { value: navy },
    },
  }));
  const screen = new Mesh(own(new PlaneGeometry(2, 2)), finish);
  screen.frustumCulled = false;
  scene.add(screen);

  // =====================================================================================
  // state
  // =====================================================================================
  let ready = false, width = 1, height = 1, aspect = 1;
  let theta = MAX_TILT, omega = 0;                        // the beam
  const swing = [{ a: 0.05, va: 0, b: 0, vb: 0, bob: 0, vbob: 0 }, { a: -0.04, va: 0, b: 0, vb: 0, bob: 0, vbob: 0 }];
  const pointer = { x: 0, y: 0, vx: 0, vy: 0, seen: false, px: 0, py: 0 };
  const onPointer = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    if (!pointer.seen) { pointer.px = pointer.x; pointer.py = pointer.y; pointer.seen = true; }
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  const camPos = new Vector3(...WIDE.hero0.p), camAim = new Vector3(...WIDE.hero0.t);
  const cam = { shift: WIDE.hero0.shift, rise: 0, dim: 1 };
  const goal = { p: new Vector3(), t: new Vector3(), shift: 0, rise: 0, dim: 1 };
  const a3 = new Vector3(), b3 = new Vector3(), tmp = new Vector3(), tmp2 = new Vector3(), ndc = new Vector3();
  let firstFrame = true;

  const blend = (A: Node, B: Node, f: number) => {
    goal.p.set(...A.p).lerp(a3.set(...B.p), f);
    goal.t.set(...A.t).lerp(a3.set(...B.t), f);
    goal.shift = mix(A.shift, B.shift, f); goal.rise = mix(A.rise, B.rise, f); goal.dim = mix(A.dim, B.dim, f);
  };
  const aim = () => {
    const K = justice.compact ? COMPACT : WIDE;
    if (justice.poster) {                                 // the stills: a wide one, and a tall one that fills a phone screen
      const still = aspect < 0.7 ? N([0, 2.1, 14.6], [0, 1.85, 0], 0, 0.17) : N([0, 2.0, 9.4], [0, 1.78, 0]);
      blend(still, still, 0);
      return;
    }
    const shot = clamp(justice.shot, 0, 6.999), i = Math.floor(shot), f = shot - i;
    const arrive = smooth(clamp(f / 0.45));
    if (i === 0) blend(K.hero0, K.hero1, smooth(f));
    else if (i === 1) blend(K.hero1, K.svc, smooth(f));
    else if (i === 2) {
      const w = clamp(justice.walk);
      blend(K.walk0, K.walk1, w);
      goal.p.x += Math.sin(w * Math.PI * 3) * 0.3;        // a walking line, not a rail
      goal.p.y += Math.sin(w * Math.PI * 9) * 0.035;
    } else if (i === 3) blend(K.walk1, K.why, arrive);
    else if (i === 4) blend(K.why, K.how, arrive);
    else if (i === 5) blend(K.how, K.faq, arrive);
    else blend(K.faq, K.consult, arrive);
    goal.p.x *= justice.side; goal.t.x *= justice.side;    // the orbit mirrors with the reading direction
  };

  const physics = (dt: number, t: number) => {
    let right = 0;
    for (const w of weights) if (w.on) right += w.mass;
    const goalTilt = MAX_TILT * clamp((STONE - right) / STONE, -1, 1);
    // the beam: a damped spring toward the angle its loads give it
    const acc = -10.5 * (theta - goalTilt) - 1.05 * omega + pointer.vy * 0.5 * (pointer.seen ? Math.sign(pointer.x || 1) : 0) * near.beam;
    omega += acc * dt;
    theta += omega * dt;
    if (Math.abs(theta) > MAX_TILT * 1.12) { theta = Math.sign(theta) * MAX_TILT * 1.12; omega *= -0.3; }
    // the pans: pendulums pushed by the beam's own movement, the air, the pointer
    swing.forEach((s, i) => {
      const sx = i ? 1 : -1;
      const drive = -sx * omega * 0.9 + Math.sin(t * 0.7 + i * 2.1) * 0.05 + pointer.vx * near.pan[i] * 1.6;
      s.va += (-5.6 * Math.sin(s.a) - 0.42 * s.va + drive) * dt;
      s.a += s.va * dt;
      s.vb += (-5.6 * Math.sin(s.b) - 0.42 * s.vb + Math.cos(t * 0.53 + i) * 0.035 - pointer.vy * near.pan[i] * 0.9) * dt;
      s.b += s.vb * dt;
      s.vbob += (-190 * s.bob - 9 * s.vbob) * dt;
      s.bob += s.vbob * dt;
    });
  };
  const near = { beam: 0, pan: [0, 0] };

  const place = () => {
    beam.rotation.z = theta;
    pans.forEach((g, i) => {
      const sx = i ? 1 : -1, s = swing[i];
      g.position.set(sx * ARM * Math.cos(theta), PIVOT_Y - 0.05 + sx * ARM * Math.sin(theta) + s.bob, 0.11);
      g.rotation.set(s.b, 0, s.a);
      g.updateMatrixWorld(true);
      panShadow[i].position.x = g.position.x - Math.sin(s.a) * HANG;
      const lift = clamp((g.position.y - HANG - 0.3) / 2.2);
      panShadow[i].scale.setScalar(1.15 + lift * 0.9);
    });
  };

  const fly = (w: Weight, i: number, dt: number) => {
    const want = justice.poster || i < justice.count || i === justice.focus || (i === 6 && justice.final && justice.count >= 6);
    const before = w.u;
    w.u = justice.poster ? 1 : clamp(w.u + (want ? dt / 1.25 : -dt / 0.95));
    const pan = pans[1];
    tmp.copy(w.slot).applyMatrix4(pan.matrixWorld);                       // where it rests on the pan right now
    if (w.u >= 1 && before < 1) {                                         // landed
      w.on = true;
      omega -= w.mass * 2.1;
      swing[1].vbob -= w.mass * 3.4; swing[1].va += (w.slot.x || 0.12) * 0.9; swing[1].vb -= 0.16;
      wave.position.set(tmp.x, tmp.y + 0.03, tmp.z); waveT = 0;
      justice.impact++;
    } else if (w.u < 1 && before >= 1) { w.on = false; swing[1].vbob += w.mass * 1.6; }

    const s1 = smooth(clamp(w.u / 0.62)), drop = clamp((w.u - 0.7) / 0.3);
    tmp2.copy(tmp).setY(tmp.y + 0.66);                                    // the point above the pan it waits at
    w.obj.position.copy(w.home).lerp(tmp2, s1);
    w.obj.position.y += Math.sin(Math.PI * s1) * 0.42;
    w.obj.position.z += Math.sin(Math.PI * s1) * 0.55;
    w.obj.position.lerp(tmp, drop * drop);
    w.obj.rotation.set(Math.sin(Math.PI * clamp(w.u / 0.7)) * 1.05 + pan.rotation.x * drop, s1 * Math.PI * 2, pan.rotation.z * drop * drop);
  };

  return {
    host,
    scene,
    camera: flatCamera,
    ready: () => ready,

    async prepare(renderer) {
      const hdr = await new HDRLoader().loadAsync('/media/img/dusk-env.hdr');
      // turn the map so its sun stands where ours does (three puts u = 0.5 on +x; the photo's sun is at u ≈ 0.68)
      const img = hdr.image as { data: Uint16Array | Float32Array; width: number; height: number };
      const want = Math.atan2(SUN.z, SUN.x) / (Math.PI * 2) + 0.5;
      const by = ((Math.round((0.68 - want) * img.width) % img.width) + img.width) % img.width;
      if (by) {
        const row = img.width * 4, copy = img.data.slice(0, row);
        for (let y = 0; y < img.height; y++) {
          copy.set(img.data.subarray(y * row, (y + 1) * row));
          for (let x = 0; x < img.width; x++) {
            const from = ((x + by) % img.width) * 4;
            img.data.set(copy.subarray(from, from + 4), y * row + x * 4);
          }
        }
        hdr.needsUpdate = true;
      }
      hdr.mapping = EquirectangularReflectionMapping;
      const pmrem = new PMREMGenerator(renderer);
      const env = own(pmrem.fromEquirectangular(hdr));
      world.environment = env.texture;
      world.environmentIntensity = 0.42;
      pmrem.dispose();
      hdr.dispose();

      const float = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
      target = own(new WebGLRenderTarget(Math.max(width, 2), Math.max(height, 2), {
        type: float ? HalfFloatType : UnsignedByteType, depthBuffer: true, stencilBuffer: false, samples: 4,
        minFilter: LinearFilter, magFilter: LinearFilter, generateMipmaps: false,
      }));
      finish.uniforms.tScene.value = target.texture;
      if (!float) finish.uniforms.uExposure.value = 1.25;
      await renderer.compileAsync(world, camera);
      ready = true;
    },

    update(t, deltaMs) {
      const dt = Math.min(deltaMs, 50) / 1000;
      time.value = t;
      if (justice.poster) { theta = 0; omega = 0; swing.forEach((s) => { s.a = s.va = s.b = s.vb = s.bob = s.vbob = 0; }); }

      // pointer: speed in screen units per second, and how close it is to each part of the scales
      if (pointer.seen && dt > 0) {
        const k = 1 - Math.exp(-dt / 0.08);
        pointer.vx += ((pointer.x - pointer.px) / dt - pointer.vx) * k;
        pointer.vy += ((pointer.y - pointer.py) / dt - pointer.vy) * k;
        pointer.px = pointer.x; pointer.py = pointer.y;
        pointer.vx = clamp(pointer.vx, -4, 4); pointer.vy = clamp(pointer.vy, -4, 4);
      }
      camera.updateMatrixWorld();
      pans.forEach((g, i) => {
        ndc.set(g.position.x, g.position.y - HANG, g.position.z).project(camera);
        near.pan[i] = 1 - smooth(clamp(Math.hypot((ndc.x - pointer.x) * aspect, ndc.y - pointer.y) / 0.75));
      });
      ndc.set(0, PIVOT_Y, 0).project(camera);
      near.beam = 1 - smooth(clamp(Math.hypot((ndc.x - pointer.x) * aspect, ndc.y - pointer.y) / 1.1));

      const steps = justice.poster ? 0 : 4;
      for (let i = 0; i < steps; i++) physics(dt / steps, t);
      place();
      weights.forEach((w, i) => fly(w, i, dt));
      if (waveT < 1) {
        waveT = Math.min(waveT + dt / 0.7, 1);
        wave.scale.setScalar(0.1 + waveT * 0.62);
        waveMat.opacity = (1 - waveT) * (1 - waveT) * 0.9;
      }

      // camera: eased toward the node of the section, with a little of the pointer in it
      aim();
      const k = firstFrame || justice.poster ? 1 : 1 - Math.exp(-dt / 0.38);
      firstFrame = false;
      camPos.lerp(goal.p, k); camAim.lerp(goal.t, k);
      cam.shift += (goal.shift - cam.shift) * k; cam.rise += (goal.rise - cam.rise) * k; cam.dim += (goal.dim - cam.dim) * k;
      const sway = justice.poster ? 0 : 1;
      camera.position.set(
        camPos.x + (Math.sin(t * 0.21) * 0.07 + pointer.x * 0.22) * sway,
        camPos.y + (Math.sin(t * 0.17 + 1) * 0.04 + pointer.y * 0.1) * sway,
        camPos.z,
      );
      camera.lookAt(camAim);
      camera.aspect = aspect;
      camera.setViewOffset(width, height, -cam.shift * justice.side * width, cam.rise * height, width, height);
      sky.position.copy(camera.position);

      // the pointer carries a warm light across the brass
      if (pointer.seen) {
        ndc.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
        const d = (1.7 - camera.position.z) / ndc.z;
        lamp.position.copy(camera.position).addScaledVector(ndc, d);
        lamp.intensity += ((justice.poster ? 0 : 9) - lamp.intensity) * (1 - Math.exp(-dt / 0.5));
      }

      // the sun on screen, for the god rays
      camera.updateMatrixWorld();
      ndc.copy(camera.position).addScaledVector(SUN, 100).project(camera);
      const front = b3.copy(SUN).dot(tmp.set(0, 0, -1).applyQuaternion(camera.quaternion));
      finish.uniforms.uSun.value.set(ndc.x * 0.5 + 0.5, ndc.y * 0.5 + 0.5);
      finish.uniforms.uSunOn.value = smooth(clamp((front - 0.2) / 0.5));
      finish.uniforms.uVeil.value = justice.veil;
      finish.uniforms.uDim.value = cam.dim;
    },

    prerender(renderer: WebGLRenderer) {
      if (!target) return;
      const mapping = renderer.toneMapping;
      renderer.toneMapping = NoToneMapping;                // linear light into the target; the finish pass maps it
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
      dustMat.uniforms.uSize.value = height * 0.055;
    },
    dispose() {
      window.removeEventListener('pointermove', onPointer);
      keep.forEach((d) => d.dispose());
      world.environment = null;
    },
  };
}
