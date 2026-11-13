/**
 * Act "wipe" — Home §1.3: the four area photos inside the WebGL stage, with a different shader transition
 * into each one. Reads scroll state from ../bridge (written by scenes/areas.ts). The textures are the
 * section's own <img> elements (no second download); until they are decoded the DOM version shows.
 */
import { gsap } from 'gsap';
import { LinearFilter, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Texture, Vector2 } from 'three';
import type { Act, Quality } from '../stage';
import { areas } from '../bridge';
import { fragment, vertex } from '../shaders/wipe.glsl';
import { token } from './util';

const OCT: Record<Quality, number> = { high: 5, lite: 3 };

export function createWipeAct(host: HTMLElement, images: HTMLImageElement[], dir: 1 | -1, desktop: boolean): Act {
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const page = document.documentElement;
  const dark = host;                                      // sits inside a .theme-dark card

  const blank = new Texture();
  const textures: (Texture | null)[] = images.map(() => null);
  const focus = images.map((img) => parseFloat(img.dataset.focus || '50') / 100);
  let loaded = 0;
  images.forEach((img, i) => {
    img.loading = 'eager';                                // the section is near: do not wait for lazy loading
    // An ImageBitmap carries the file's real pixel size (an <img> reports its layout size, which breaks the
    // upload on small screens) and is decoded off the main thread.
    img.decode()
      .then(() => createImageBitmap(img, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
      .then((bmp) => {
        const t = new Texture(bmp);
        t.flipY = false;                                  // already flipped while decoding
        t.minFilter = t.magFilter = LinearFilter;
        t.generateMipmaps = false;
        t.needsUpdate = true;
        textures[i] = t;
        loaded++;
      })
      .catch(() => { /* a photo that fails to load keeps the DOM version of the section */ });
  });

  const uniforms = {
    uFrom: { value: blank as Texture },
    uTo: { value: blank as Texture },
    uFromSize: { value: new Vector2(16, 9) },
    uToSize: { value: new Vector2(16, 9) },
    uFocus: { value: new Vector2(0.5, 0.5) },
    uFromOn: { value: 0 },
    uT: { value: 0 },
    uStyle: { value: 0 },
    uHold: { value: 0 },
    uDir: { value: dir },
    uRes: { value: new Vector2(1, 1) },
    uMouse: { value: new Vector2(0, 0) },
    uTime: { value: 0 },
    uPage: { value: token('--color-bg', page) },
    uAmber: { value: token('--color-accent', dark) },
    uNavy: { value: token('--color-bg', dark) },
    uCloudLit: { value: token('--color-accent', page, ['--color-surface', 14]) },
  };
  const material = new ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment, defines: { OCT: OCT.lite } });
  const mesh = new Mesh(new PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const mouse = uniforms.uMouse.value;
  const xTo = gsap.quickTo(mouse, 'x', { duration: 1, ease: 'power3.out' });
  const yTo = gsap.quickTo(mouse, 'y', { duration: 1, ease: 'power3.out' });
  const onMove = (e: PointerEvent) => {
    xTo((e.clientX / window.innerWidth) * 2 - 1);
    yTo(-((e.clientY / window.innerHeight) * 2 - 1));
  };
  if (desktop) window.addEventListener('pointermove', onMove, { passive: true });

  const size = (t: Texture, v: Vector2) => {
    const bmp = t.image as ImageBitmap;
    v.set(bmp.width, bmp.height);
  };

  return {
    host,
    scene,
    camera,
    ready: () => loaded === images.length,
    update(time) {
      const last = images.length;
      const p = Math.min(Math.max(areas.progress, 0), last);
      const to = Math.min(Math.floor(p) + 1, last);         // photo index 1…n that is arriving
      const from = to - 1;                                  // 0 = intro
      uniforms.uT.value = to === last && p >= last ? 1 : p - from;
      uniforms.uStyle.value = from % 4;
      uniforms.uFromOn.value = from > 0 ? 1 : 0;
      uniforms.uHold.value = areas.hold;
      uniforms.uTime.value = time;
      const a = textures[from - 1], b = textures[to - 1];
      if (a) { uniforms.uFrom.value = a; size(a, uniforms.uFromSize.value); uniforms.uFocus.value.x = focus[from - 1]; }
      if (b) { uniforms.uTo.value = b; size(b, uniforms.uToSize.value); uniforms.uFocus.value.y = focus[to - 1]; }
    },
    resize(width, height) { uniforms.uRes.value.set(width, height); },
    setQuality(quality) { material.defines = { OCT: OCT[quality] }; material.needsUpdate = true; },
    dispose() {
      window.removeEventListener('pointermove', onMove);
      gsap.killTweensOf(mouse);
      mesh.geometry.dispose();
      material.dispose();
      blank.dispose();
      textures.forEach((t) => { (t?.image as ImageBitmap | undefined)?.close(); t?.dispose(); });
    },
  };
}
