/**
 * The 3D layer: ONE WebGL renderer + canvas per page, shared by every "act" (a scene that draws).
 * - loaded lazily (dynamic import) on the first interaction, never part of the first bundle or the load phase
 * - driven by gsap.ticker (no second RAF loop)
 * - draws only while the active act's host is on screen and the tab is visible
 * - every act always draws its FULL scene (quality policy, CLAUDE.md). Smoothness is protected only by the
 *   dynamic render scale below: the pixel ratio of the canvas, never what is drawn. Disposes on page leave.
 * The canvas is moved into the host of the act that is MOST visible; that host gets `.is-drawing` while the
 * canvas paints there (its DOM version hides itself with CSS) and loses it when the canvas leaves.
 * The shared canvas has NO depth buffer (the footage acts are flat layers). An act that needs real depth (solid
 * 3D models) draws them into its own render target, which has one, in `prerender`, and its `scene` is then just
 * the pass that puts that picture on the canvas (see acts/justice.ts). Still one renderer, one context.
 */
import { gsap } from 'gsap';
import { WebGLRenderer, type Camera, type Scene } from 'three';

export interface Act {
  host: HTMLElement;                // the canvas is mounted here while this act is on screen
  scene: Scene;
  camera: Camera;
  ready(): boolean;                 // false until the act has something to show (e.g. first video frame)
  update(time: number, deltaMs: number): void;   // called before every render
  resize(width: number, height: number): void;   // canvas size in device pixels (changes with the render scale)
  dispose(): void;
  /** optional: load / compile what `prerender` needs (environment map, the shaders of the inner scene) */
  prepare?(renderer: WebGLRenderer): Promise<unknown>;
  /** optional: draw into the act's own render targets, right before `scene` is drawn to the canvas */
  prerender?(renderer: WebGLRenderer): void;
}

/**
 * Dynamic render scale = the canvas pixel ratio. The ONLY thing that adapts to the device.
 *   top     min(devicePixelRatio, 1.5) — full quality, on every device
 *   floor   0.75 (or the top, if the screen is below that)
 *   step    0.125, at most one per sample window (60 rendered frames, after 30 warm-up frames)
 * Each window is judged by its MEDIAN frame gap (gaps snap to the display's refresh steps, so one long frame
 * or a burst of main-thread work does not move it).
 *   - slower than SLOW_MS → try one step DOWN; keep it only if the next window is ≥ 10% faster. If not, the
 *     slowness is not the GPU — a 30 fps cap (Chrome Energy Saver on battery), CPU throttling, a busy main
 *     thread — so the old ratio comes back and is held (no new step down until frames are fast again).
 *   - faster than FAST_MS → one step UP.
 *   - below the top otherwise → every RETRY_WINDOWS windows try one step UP; keep it unless the next window
 *     is ≥ 10% slower. So a capped or busy device always climbs back to full resolution.
 * Nothing else ever changes: no act is dropped, no shader is simplified, and a slow device never falls back to
 * the css version (only a lost WebGL context does).
 */
const RATIO_TOP = 1.5;
const RATIO_FLOOR = 0.75;
const RATIO_STEP = 0.125;
const SLOW_MS = 22;                 // ≈ 45 fps
const FAST_MS = 18;                 // ≈ 55 fps
const WARMUP_FRAMES = 30;           // shader compile, texture uploads after an act change
const SAMPLE_FRAMES = 60;
const BETTER = 0.9;                 // a step down must cut the median frame gap by ≥ 10% …
const WORSE = 1.1;                  // … a step up is kept unless it adds ≥ 10%
const RETRY_WINDOWS = 8;            // below the top: try a step up this often

export class Stage {
  readonly canvas: HTMLCanvasElement;
  private renderer: WebGLRenderer;
  private acts = new Map<HTMLElement, Act>();
  private active: Act | null = null;
  private compiled = new WeakSet<Act>();
  private running = false;
  private shown = false;
  private visible = new Map<Act, number>();   // act → visible height of its host (px)
  private drawing: HTMLElement | null = null; // host that currently shows the canvas (.is-drawing)
  private failed = false;
  private io: IntersectionObserver;
  private ro: ResizeObserver;

  // render-scale controller
  private ratio = RATIO_TOP;        // wanted pixel ratio (clamped by the screen in pixelRatio())
  private frames = 0;
  private gaps = new Float32Array(SAMPLE_FRAMES);
  private probe: { from: number; before: number; down: boolean } | null = null;   // a step waiting for its verdict
  private held = false;             // lowering does not help here: no step down until frames are fast again
  private calm = 0;                 // windows since the last step, while below the top

  constructor(private onFail: () => void) {
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
    this.applyRatio();
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
    // compile the shaders without blocking (KHR_parallel_shader_compile); render only when they are ready
    Promise.all([this.renderer.compileAsync(act.scene, act.camera), act.prepare?.(this.renderer)])
      .then(() => this.compiled.add(act), (err) => this.remove(act, err));
    this.io.observe(act.host);
  }

  /** an act that cannot compile leaves; its section keeps its DOM version, every other act keeps drawing */
  private remove(act: Act, err: unknown) {
    if (this.failed) return;
    console.warn('[stage] act failed to compile, its section shows the DOM version', err);
    this.io.unobserve(act.host);
    this.acts.delete(act.host);
    this.visible.delete(act);
    if (this.active === act) this.activate(null);
    act.dispose();
  }

  private activate(act: Act | null) {
    if (this.active) this.ro.unobserve(this.active.host);
    this.active = act;
    this.resetSamples();                               // a new act uploads textures: do not count those frames
    this.held = false;                                 // a new act may be heavier: allow one new probe
    this.calm = 0;
    if (this.drawing !== (act?.host ?? null)) this.setDrawing(null);   // the canvas is leaving that host
    if (act) {
      if (this.canvas.parentElement !== act.host) act.host.append(this.canvas);
      this.ro.observe(act.host);
      this.resize();
    }
    this.sync();
  }

  private top() { return Math.min(window.devicePixelRatio || 1, RATIO_TOP); }

  private pixelRatio() {
    const top = this.top();
    return Math.max(Math.min(this.ratio, top), Math.min(RATIO_FLOOR, top));
  }

  private applyRatio() {
    const pr = this.pixelRatio();
    this.renderer.setPixelRatio(pr);
    this.canvas.dataset.ratio = String(pr);            // read by the QA scripts
  }

  private resize() {
    const host = this.active?.host;
    if (!host || !host.clientWidth) return;
    this.applyRatio();                                 // the screen's devicePixelRatio may have changed
    this.renderer.setSize(host.clientWidth, host.clientHeight, false);
    this.active!.resize(this.canvas.width, this.canvas.height);
  }

  private setRatio(ratio: number) {
    const before = this.pixelRatio();
    this.ratio = ratio;
    if (this.pixelRatio() !== before) this.resize();
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
    this.resetSamples();
    if (run) gsap.ticker.add(this.tick);
    else gsap.ticker.remove(this.tick);
  };

  private resetSamples() {
    this.frames = 0;
    if (this.probe) { const { from } = this.probe; this.probe = null; this.setRatio(from); }   // no verdict: undo
  }

  private tick = (time: number, deltaMs: number) => {
    const act = this.active;
    if (!act) return;
    act.update(time, deltaMs);
    if (!act.ready() || !this.compiled.has(act) || this.canvas.parentElement !== act.host) return;
    act.prerender?.(this.renderer);
    this.renderer.render(act.scene, act.camera);
    this.setDrawing(act.host);
    if (!this.shown) { this.shown = true; this.canvas.classList.add('is-on'); }

    if (++this.frames <= WARMUP_FRAMES) return;
    this.gaps[this.frames - WARMUP_FRAMES - 1] = deltaMs;
    if (this.frames < WARMUP_FRAMES + SAMPLE_FRAMES) return;
    this.frames = WARMUP_FRAMES;
    this.adapt(this.gaps.slice().sort()[SAMPLE_FRAMES >> 1]);
  };

  /** one decision per sample window, from its median frame gap (see the comment above RATIO_TOP) */
  private adapt(ms: number) {
    const current = this.pixelRatio(), top = this.top();
    if (this.probe) {
      const { from, before, down } = this.probe;
      this.probe = null;
      this.calm = 0;
      if (down) {
        if (ms > before * BETTER) { this.held = true; this.setRatio(from); }   // not the GPU: the old ratio back
      } else if (ms > before * WORSE) this.setRatio(from);                   // the step up cost frames: back down
      else if (ms > SLOW_MS) this.held = true;                                // it cost nothing: slow for other reasons
      return;
    }
    if (ms > SLOW_MS && !this.held && current > Math.min(RATIO_FLOOR, top)) {
      this.probe = { from: this.ratio, before: ms, down: true };
      this.setRatio(current - RATIO_STEP);
    } else if (ms < FAST_MS) {
      this.held = false;
      this.calm = 0;
      if (current < top) this.setRatio(current + RATIO_STEP);
    } else if (current < top && ++this.calm >= RETRY_WINDOWS) {
      this.probe = { from: this.ratio, before: ms, down: false };
      this.setRatio(current + RATIO_STEP);
    }
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
