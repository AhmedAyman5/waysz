/**
 * The 3D layer: ONE WebGL renderer + canvas per page, shared by every "act" (a scene that draws).
 * - loaded lazily (dynamic import) on the first interaction, never part of the first bundle or the load phase
 * - driven by gsap.ticker (no second RAF loop)
 * - draws only while the active act's host is on screen and the tab is visible
 * - DPR capped per tier, downgrades itself when frames are slow, disposes on page leave
 * The canvas is moved into the host of the act that is MOST visible; that host gets `.is-drawing` while the
 * canvas paints there (its DOM version hides itself with CSS) and loses it when the canvas leaves.
 */
import { gsap } from 'gsap';
import { WebGLRenderer, type Camera, type Scene } from 'three';
import type { Tier } from './tier';

export type Quality = Exclude<Tier, 'css'>;

export interface Act {
  host: HTMLElement;                // the canvas is mounted here while this act is on screen
  scene: Scene;
  camera: Camera;
  ready(): boolean;                 // false until the act has something to show (e.g. first video frame)
  update(time: number, deltaMs: number): void;   // called before every render
  resize(width: number, height: number): void;
  setQuality(quality: Quality): void;
  dispose(): void;
}

const DPR: Record<Quality, number> = { high: 1.5, lite: 1.25 };
const SLOW_FRAME_MS = 27;           // average over the sample window → downgrade
const SAMPLE_FRAMES = 90;

export class Stage {
  readonly canvas: HTMLCanvasElement;
  private renderer: WebGLRenderer;
  private acts = new Map<HTMLElement, Act>();
  private active: Act | null = null;
  private compiled = new WeakSet<Act>();
  private running = false;
  private shown = false;
  private frames = 0;
  private slowSum = 0;
  private slowWindows = 0;
  private visible = new Map<Act, number>();   // act → visible height of its host (px)
  private drawing: HTMLElement | null = null; // host that currently shows the canvas (.is-drawing)
  private failed = false;
  private io: IntersectionObserver;
  private ro: ResizeObserver;

  constructor(private quality: Quality, private onFail: () => void) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'stage-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR[quality]));
    this.renderer.debug.checkShaderErrors = import.meta.env.DEV;   // the status check blocks the main thread

    // Several hosts can be on screen at once (section hand-offs): the most visible one gets the canvas.
    this.io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const act = this.acts.get(e.target as HTMLElement);
        if (act) this.visible.set(act, e.isIntersecting ? e.intersectionRect.height : 0);
      }
      let best: Act | null = null, most = 0;
      this.visible.forEach((h, act) => { if (h > most) { most = h; best = act; } });
      if (best !== this.active) this.activate(best);
    }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] });
    this.ro = new ResizeObserver(() => this.resize());

    this.canvas.addEventListener('webglcontextlost', this.fail);
    document.addEventListener('visibilitychange', this.sync);
    window.addEventListener('pagehide', this.dispose, { once: true });
  }

  add(act: Act) {
    this.acts.set(act.host, act);
    act.setQuality(this.quality);
    // compile the shaders without blocking (KHR_parallel_shader_compile); render only when they are ready
    this.renderer.compileAsync(act.scene, act.camera).then(() => this.compiled.add(act), () => this.fail());
    this.io.observe(act.host);
  }

  private activate(act: Act | null) {
    if (this.active) this.ro.unobserve(this.active.host);
    this.active = act;
    this.frames = 0;                                   // a new act uploads textures: do not count those frames
    this.slowSum = 0;
    if (this.drawing !== (act?.host ?? null)) this.setDrawing(null);   // the canvas is leaving that host
    if (act) {
      if (this.canvas.parentElement !== act.host) act.host.append(this.canvas);
      this.ro.observe(act.host);
      this.resize();
    }
    this.sync();
  }

  private resize() {
    const host = this.active?.host;
    if (!host || !host.clientWidth) return;
    this.renderer.setSize(host.clientWidth, host.clientHeight, false);
    this.active!.resize(this.canvas.width, this.canvas.height);
  }

  /** `.is-drawing` on a host = the canvas is painting there right now, so its DOM version may hide */
  private setDrawing(host: HTMLElement | null) {
    if (this.drawing === host) return;
    this.drawing?.classList.remove('is-drawing');
    this.drawing = host;
    host?.classList.add('is-drawing');
  }

  /** start/stop the ticker callback so nothing runs off-screen or in a hidden tab */
  private sync = () => {
    const run = !!this.active && !document.hidden;
    if (run === this.running) return;
    this.running = run;
    this.frames = 0;
    this.slowSum = 0;
    if (run) gsap.ticker.add(this.tick);
    else gsap.ticker.remove(this.tick);
  };

  private tick = (time: number, deltaMs: number) => {
    const act = this.active;
    if (!act) return;
    act.update(time, deltaMs);
    if (!act.ready() || !this.compiled.has(act) || this.canvas.parentElement !== act.host) return;
    this.renderer.render(act.scene, act.camera);
    this.setDrawing(act.host);
    if (!this.shown) { this.shown = true; this.canvas.classList.add('is-on'); }

    // Frame-time watchdog. Skips the first frames (shader compile, texture uploads) and needs TWO slow
    // windows in a row, so a short burst of work (frames streaming in) never costs the visitor the 3D layer.
    if (++this.frames > 30) {
      this.slowSum += Math.min(deltaMs, 100);
      if (this.frames === 30 + SAMPLE_FRAMES) {
        const slow = this.slowSum / SAMPLE_FRAMES > SLOW_FRAME_MS;
        this.slowWindows = slow ? this.slowWindows + 1 : 0;
        if (this.slowWindows >= 2) { this.slowWindows = 0; this.downgrade(); }
        this.frames = 30;
        this.slowSum = 0;
      }
    }
  };

  private downgrade() {
    if (this.quality === 'lite') { this.fail(); return; }
    this.quality = 'lite';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR.lite));
    this.acts.forEach((a) => a.setQuality('lite'));
    this.resize();
  }

  private fail = () => {
    if (this.failed) return;
    this.failed = true;
    this.dispose();
    this.onFail();
  };

  dispose = () => {
    gsap.ticker.remove(this.tick);
    this.running = false;
    this.io.disconnect();
    this.ro.disconnect();
    document.removeEventListener('visibilitychange', this.sync);
    window.removeEventListener('pagehide', this.dispose);
    this.canvas.removeEventListener('webglcontextlost', this.fail);
    this.setDrawing(null);
    this.acts.forEach((a) => a.dispose());
    this.acts.clear();
    this.visible.clear();
    this.active = null;
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  };
}
