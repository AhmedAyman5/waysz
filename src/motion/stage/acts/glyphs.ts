/**
 * Act "glyphs" — Software page hero, "Code in flight".
 * One instanced mesh: the characters of the hero's code (each lands on the DOM character it replaces) plus a
 * swarm of glyphs drifting in depth. A glyph atlas is drawn once on a 2D canvas with the page's own monospace
 * font. Behind them a full-screen backdrop draws the dusk footage exactly like the DOM version.
 * Reads `code` from ../bridge (written by scenes/code-hero.ts). No text lives here: the canvas is decorative.
 * Glyphs per tier: the code (about 110) + a swarm of 1100 (high) or 320 (lite).
 */
import { gsap } from 'gsap';
import {
  CanvasTexture, InstancedBufferAttribute, InstancedBufferGeometry, LinearFilter, LinearMipmapLinearFilter, Mesh,
  PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, Texture, Vector2, VideoTexture,
} from 'three';
import type { Act, Quality } from '../stage';
import { code } from '../bridge';
import { backdropFragment, backdropVertex, glyphFragment, glyphVertex } from '../shaders/glyphs.glsl';
import { token } from './util';

const SWARM: Record<Quality, number> = { high: 1100, lite: 320 };
const MAX_CODE = 400;
const DIST = 1000;                  // camera distance: at z = 0 one world unit is one CSS pixel
const DEPTH = 2600;                 // how far back the swarm reaches
const ATLAS_PX = 56;                // font size the atlas is drawn at
const COLS = 16;
const CHARS = Array.from({ length: 94 }, (_, i) => String.fromCharCode(33 + i));
const SWARM_CHARS = '{}[]()<>=/;:+*#&|01.,_-"$!?%';

/** small seeded generator: the same glyph keeps the same random numbers through every rebuild */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export function createGlyphAct(host: HTMLElement, video: HTMLVideoElement, poster: HTMLImageElement): Act {
  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 10, 8000);
  camera.position.z = DIST;

  // ---------- backdrop: poster first, the video as soon as it plays ----------
  const videoTex = new VideoTexture(video);
  videoTex.minFilter = videoTex.magFilter = LinearFilter;
  videoTex.generateMipmaps = false;
  let posterTex: Texture | null = null;
  let plateReady = false, onVideo = false;
  const back = {
    uPlate: { value: videoTex as Texture },
    uRes: { value: new Vector2(1, 1) },
    uPlateSize: { value: new Vector2(16, 9) },
    uBox: { value: new Vector2(0, 1) },
    uMouse: { value: new Vector2(0, 0) },
    uFlip: { value: 0 },
    uNight: { value: 0 },
    uPush: { value: 0 },
    uTime: { value: 0 },
    uNavy: { value: token('--color-bg', host) },
  };
  poster.decode()
    .then(() => createImageBitmap(poster, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
    .then((bmp) => {
      if (onVideo) { bmp.close(); return; }
      posterTex = new Texture(bmp);
      posterTex.flipY = false;
      posterTex.minFilter = posterTex.magFilter = LinearFilter;
      posterTex.generateMipmaps = false;
      posterTex.needsUpdate = true;
      back.uPlate.value = posterTex;
      back.uPlateSize.value.set(bmp.width, bmp.height);
      plateReady = true;
    })
    .catch(() => { /* no poster: the act waits for the video */ });
  const backMaterial = new ShaderMaterial({ uniforms: back, vertexShader: backdropVertex, fragmentShader: backdropFragment, depthTest: false, depthWrite: false });
  const backMesh = new Mesh(new PlaneGeometry(2, 2), backMaterial);
  backMesh.frustumCulled = false;
  backMesh.renderOrder = 0;
  scene.add(backMesh);

  // ---------- glyphs ----------
  const total = MAX_CODE + SWARM.high;
  const slot = new Float32Array(total * 3), from = new Float32Array(total * 3);
  const cell = new Float32Array(total * 2), meta = new Float32Array(total * 4);
  const quad = new PlaneGeometry(1, 1);
  const geometry = new InstancedBufferGeometry();
  geometry.index = quad.index;
  geometry.setAttribute('position', quad.getAttribute('position'));
  geometry.setAttribute('uv', quad.getAttribute('uv'));
  const attrs = {
    aSlot: new InstancedBufferAttribute(slot, 3), aFrom: new InstancedBufferAttribute(from, 3),
    aUv: new InstancedBufferAttribute(cell, 2), aMeta: new InstancedBufferAttribute(meta, 4),
  };
  Object.entries(attrs).forEach(([name, attr]) => geometry.setAttribute(name, attr));
  geometry.instanceCount = 0;

  const ink = token('--color-ink', host);
  const uniforms = {
    uAtlas: { value: new Texture() as Texture },
    uTone: { value: [ink, token('--color-accent', host), token('--hue-software', host, ['--color-ink', 78]), token('--color-ink-muted', host)] },
    uTime: { value: 0 },
    uLeave: { value: 0 },
    uSwarm: { value: 0 },
    uField: { value: 0 },
    uPush: { value: 0 },
    uDist: { value: DIST },
    uDepth: { value: DEPTH },
    uMouse: { value: new Vector2(9999, 9999) },
    uQuad: { value: new Vector2(10, 20) },
    uCell: { value: new Vector2(1 / COLS, 1 / 6) },
  };
  const material = new ShaderMaterial({ uniforms, vertexShader: glyphVertex, fragmentShader: glyphFragment, transparent: true, depthTest: false, depthWrite: false });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  scene.add(mesh);

  let quality: Quality = 'lite';
  let built = -1, builtW = 0, builtH = 0, codeCount = 0, atlasKey = '';
  let cw = 1, ch = 1;                                       // atlas cell, in atlas pixels

  /** the glyph atlas: every printable ASCII character, drawn with the font of the DOM code */
  const drawAtlas = (family: string, weight: string, lineRatio: number) => {
    const key = `${weight} ${family} ${lineRatio.toFixed(3)}`;
    if (key === atlasKey) return;
    atlasKey = key;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const font = `${weight} ${ATLAS_PX}px ${family}`;
    ctx.font = font;
    const advance = ctx.measureText('M').width;
    const m = ctx.measureText('Mg');
    const ascent = m.fontBoundingBoxAscent ?? ATLAS_PX * 0.8, descent = m.fontBoundingBoxDescent ?? ATLAS_PX * 0.2;
    cw = Math.ceil(advance) + 6;
    ch = Math.ceil(ATLAS_PX * lineRatio);
    const rows = Math.ceil(CHARS.length / COLS);
    canvas.width = cw * COLS;
    canvas.height = ch * rows;
    ctx.font = font;
    ctx.fillStyle = '#fff';                                  // only the alpha channel is used
    ctx.textBaseline = 'alphabetic';
    const baseline = (ch - (ascent + descent)) / 2 + ascent; // where CSS puts the baseline inside a line box
    CHARS.forEach((c, i) => ctx.fillText(c, (i % COLS) * cw + (cw - advance) / 2, Math.floor(i / COLS) * ch + baseline));
    uniforms.uAtlas.value.dispose();
    const tex = new CanvasTexture(canvas);
    tex.minFilter = LinearMipmapLinearFilter;
    tex.magFilter = LinearFilter;
    uniforms.uAtlas.value = tex;
    uniforms.uCell.value.set(1 / COLS, 1 / rows);
  };
  const cellOf = (c: string, i: number) => {
    const n = Math.max(c.charCodeAt(0) - 33, 0) % CHARS.length;
    const rows = Math.ceil(CHARS.length / COLS);
    cell[i * 2] = (n % COLS) / COLS;
    cell[i * 2 + 1] = 1 - (Math.floor(n / COLS) + 1) / rows;
  };

  /** (re)build the instances from the measured layout and the host size */
  const build = () => {
    const layout = code.layout;
    const w = host.clientWidth, h = host.clientHeight;
    if (!layout || !w || !h) return;
    built = code.version; builtW = w; builtH = h;
    drawAtlas(layout.family, layout.weight, layout.lineH / layout.fontPx);
    const k = layout.fontPx / ATLAS_PX;
    uniforms.uQuad.value.set(cw * k, ch * k);

    codeCount = Math.min(layout.glyphs.length, MAX_CODE);
    const rand = seeded(7);
    for (let i = 0; i < total; i++) {
      const r1 = rand(), r2 = rand(), r3 = rand(), r4 = rand(), r5 = rand();
      if (i < codeCount) {
        const g = layout.glyphs[i];
        slot.set([g.x + layout.cellW / 2 - w / 2, h / 2 - (g.y + layout.lineH / 2), 0], i * 3);
        const z = -1900 + r3 * 2300;                                    // somewhere in the swarm
        const spread = (DIST - z) / DIST;                               // stay inside the view at that depth
        from.set([(r4 - 0.5) * w * 1.1 * spread, (r5 - 0.5) * h * 1.1 * spread, z], i * 3);
        cellOf(g.ch, i);
        meta.set([0, g.tone, r1, r2], i * 4);
      } else {
        const j = i - codeCount;
        slot.set([(r3 - 0.5) * w * 2.8, (r4 - 0.5) * h * 2.6, -DEPTH + r5 * (DEPTH + 500)], i * 3);
        cellOf(SWARM_CHARS[j % SWARM_CHARS.length], i);
        meta.set([1, r1 < 0.16 ? 1 : r1 < 0.24 ? 2 : r1 < 0.6 ? 3 : 0, r1, r2], i * 4);
      }
    }
    Object.values(attrs).forEach((a) => { a.needsUpdate = true; });
    geometry.instanceCount = codeCount + SWARM[quality];
  };

  // ---------- pointer: position in host pixels (centred, y up) + field strength ----------
  const mouse = uniforms.uMouse.value;
  const field = uniforms.uField;
  const xTo = gsap.quickTo(mouse, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(mouse, 'y', { duration: 0.35, ease: 'power3.out' });
  const parallax = back.uMouse.value;
  let idle: gsap.core.Tween | null = null;
  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom) return;
    const x = e.clientX - r.left - r.width / 2, y = r.height / 2 - (e.clientY - r.top);
    if (field.value < 0.05) { mouse.set(x, y); xTo(x, x); yTo(y, y); } else { xTo(x); yTo(y); }
    gsap.to(field, { value: 1, duration: 0.4, overwrite: true });
    gsap.to(parallax, { x: x / r.width * 2, y: y / r.height * 2, duration: 1.2, ease: 'power3.out', overwrite: true });
    idle?.kill();
    // a finger leaves no pointer behind: let the field fade once it stops moving
    if (e.pointerType !== 'mouse') idle = gsap.to(field, { value: 0, duration: 0.8, delay: 0.5 });
  };
  const onOut = () => { idle?.kill(); idle = gsap.to(field, { value: 0, duration: 0.6 }); };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onOut);

  let started = false;

  return {
    host,
    scene,
    camera,
    ready: () => plateReady && code.settled && built >= 0,
    update(time) {
      if (code.layout && (built !== code.version || host.clientWidth !== builtW || host.clientHeight !== builtH)) build();
      if (!onVideo && video.readyState >= 2 && video.videoWidth && !video.paused) {
        onVideo = plateReady = true;
        back.uPlate.value = videoTex;
        back.uPlateSize.value.set(video.videoWidth, video.videoHeight);
        (posterTex?.image as ImageBitmap | undefined)?.close();
        posterTex?.dispose();
        posterTex = null;
      }
      if (!started && plateReady && code.settled && built >= 0) {
        started = true;
        gsap.to(uniforms.uSwarm, { value: 1, duration: 2.6, ease: 'power2.out' });   // the swarm fades in around the settled code
      }
      const leave = code.leave;
      uniforms.uTime.value = back.uTime.value = time;
      uniforms.uLeave.value = leave;
      uniforms.uPush.value = back.uPush.value = leave;
      back.uNight.value = Math.min(Math.max((leave - 0.5) / 0.45, 0), 1);
      back.uBox.value.set(code.plate[0], code.plate[1]);
    },
    resize(width, height) {
      back.uRes.value.set(width, height);
      const w = host.clientWidth || 1, h = host.clientHeight || 1;
      camera.aspect = w / h;
      camera.fov = (2 * Math.atan(h / 2 / DIST) * 180) / Math.PI;
      camera.updateProjectionMatrix();
    },
    setQuality(q) {
      quality = q;
      if (built >= 0) geometry.instanceCount = codeCount + SWARM[q];
    },
    dispose() {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onOut);
      gsap.killTweensOf([mouse, field, parallax, uniforms.uSwarm]);
      idle?.kill();
      geometry.dispose();
      quad.dispose();
      material.dispose();
      uniforms.uAtlas.value.dispose();
      backMesh.geometry.dispose();
      backMaterial.dispose();
      videoTex.dispose();
      (posterTex?.image as ImageBitmap | undefined)?.close();
      posterTex?.dispose();
    },
  };
}
