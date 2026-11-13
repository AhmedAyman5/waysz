/**
 * Act "flight" — Home §1.2 Hero + §1.2b The Journey in one full-screen shader.
 * Reads scroll state from ../bridge (written by the hero-takeoff and image-sequence scenes).
 */
import { gsap } from 'gsap';
import {
  Color, LinearFilter, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial,
  Texture, Vector2, VideoTexture,
} from 'three';
import type { Act, Quality } from '../stage';
import { flight } from '../bridge';
import { fragment, vertex } from '../shaders/flight.glsl';

const DEFINES: Record<Quality, Record<string, number>> = {
  high: { OCT: 5, LAYERS: 3, RAYS: 10 },
  lite: { OCT: 3, LAYERS: 2, RAYS: 0 },
};

/** Reads a semantic color token as a three.js Color (display space, no conversion). */
function token(name: string, scope: Element, mixWith?: [string, number]) {
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

export function createFlightAct(host: HTMLElement, video: HTMLVideoElement, desktop: boolean): Act {
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const light = document.documentElement;              // light page tokens
  const dark = host;                                   // inside .theme-dark

  const videoTex = new VideoTexture(video);
  const frameTex = new Texture();
  for (const t of [videoTex, frameTex]) { t.minFilter = t.magFilter = LinearFilter; t.generateMipmaps = false; }
  frameTex.flipY = false;                              // ImageBitmaps are uploaded as they are; the shader flips v

  const uniforms = {
    uVideo: { value: videoTex },
    uFrame: { value: frameTex },
    uRes: { value: new Vector2(1, 1) },
    uVideoSize: { value: new Vector2(16, 9) },
    uFrameSize: { value: new Vector2(16, 9) },
    uMouse: { value: new Vector2(0, 0) },
    uSun: { value: new Vector2(0.16, 0.5) },
    uTime: { value: 0 },
    uMix: { value: 0 },
    uPush: { value: 0 },
    uVeil: { value: 0 },
    uVeilTex: { value: 1 },
    uSpeed: { value: 0 },
    uFocus: { value: 0.46 },
    uFrameFocus: { value: 0.62 },
    uAmber: { value: token('--color-accent', dark) },
    uNavy: { value: token('--color-bg', dark) },
    uCloudLit: { value: token('--color-accent', light, ['--color-surface', 14]) },   // warm white
    uCloudShade: { value: token('--color-brand', light, ['--color-surface', 42]) },  // blue-grey
    uVeilColor: { value: new Color() },
  };
  const veilCloud = uniforms.uCloudLit.value;
  const veilPage = token('--color-bg', light);

  const material = new ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment, defines: { ...DEFINES.lite } });
  const mesh = new Mesh(new PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  // pointer → depth (desktop only); smoothed by GSAP, no extra loop
  const mouse = uniforms.uMouse.value;
  const xTo = gsap.quickTo(mouse, 'x', { duration: 0.9, ease: 'power3.out' });
  const yTo = gsap.quickTo(mouse, 'y', { duration: 0.9, ease: 'power3.out' });
  const onMove = (e: PointerEvent) => {
    xTo((e.clientX / window.innerWidth) * 2 - 1);
    yTo(-((e.clientY / window.innerHeight) * 2 - 1));
  };
  if (desktop) window.addEventListener('pointermove', onMove, { passive: true });

  let frameId = -1;
  let skipped = false;
  let refresh = 34;
  let hasVideoFrame = false;

  return {
    host,
    scene,
    camera,
    ready: () => hasVideoFrame || flight.mix === 1,
    update(time, deltaMs) {
      uniforms.uTime.value = time;
      uniforms.uMix.value = flight.mix;
      uniforms.uPush.value = flight.push;
      uniforms.uVeil.value = flight.veil;
      uniforms.uVeilTex.value = flight.veilPage ? 1 - flight.veil : 1;
      uniforms.uSpeed.value = flight.speed;
      uniforms.uVeilColor.value.copy(veilCloud).lerp(veilPage, flight.veilPage);

      if (!hasVideoFrame && video.readyState >= 2 && video.videoWidth) {
        hasVideoFrame = true;
        uniforms.uVideoSize.value.set(video.videoWidth, video.videoHeight);
      }
      // Uploading a frame is the one expensive step. When the last frame ran long (slow CPU), upload only
      // every other tick: the footage drops to ~30fps while scroll, captions and clouds stay fluid.
      refresh = Math.min(refresh * 1.002, Math.max(deltaMs, 4));     // running estimate of the display's frame time
      const busy = deltaMs > refresh * 1.35 && !skipped;
      skipped = busy && !!flight.frame && flight.frameId !== frameId;
      if (flight.frame && flight.frameId !== frameId && !busy) {
        frameId = flight.frameId;
        frameTex.image = flight.frame;
        frameTex.needsUpdate = true;
        uniforms.uFrameSize.value.set(flight.frame.width, flight.frame.height);
        uniforms.uFrameFocus.value = flight.frameFocus;
      }
    },
    resize(width, height) {
      uniforms.uRes.value.set(width, height);
    },
    setQuality(quality) {
      material.defines = { ...DEFINES[quality] };
      material.needsUpdate = true;
    },
    dispose() {
      window.removeEventListener('pointermove', onMove);
      gsap.killTweensOf(mouse);
      mesh.geometry.dispose();
      material.dispose();
      videoTex.dispose();
      frameTex.dispose();
    },
  };
}
