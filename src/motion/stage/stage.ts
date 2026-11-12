/**
 * The 3D layer: ONE WebGL renderer + canvas per page, shared by every "act" (a scene that draws).
 * - loaded lazily (dynamic import) after the LCP, never part of the first bundle
 * - driven by gsap.ticker (no second RAF loop)
 * - draws only while the active act's host is on screen and the tab is visible
 * - DPR capped per tier, downgrades itself when frames are slow, disposes on page leave
 * The canvas is moved into the host of the act that is on screen (Part 2 adds more acts).
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
  update(time: number): void;       // called before every render
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
  private running = false;
  private shown = false;
  private frames = 0;
  private slowSum = 0;
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

    this.io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const act = this.acts.get(e.target as HTMLElement);
        if (!act) continue;
        if (e.isIntersecting) this.activate(act);
        else if (this.active === act) this.activate(null);
      }
    });
    this.ro = new ResizeObserver(() => this.resize());

    this.canvas.addEventListener('webglcontextlost', this.fail);
    document.addEventListener('visibilitychange', this.sync);
    window.addEventListener('pagehide', this.dispose, { once: true });
  }

  add(act: Act) {
    this.acts.set(act.host, act);
    act.setQuality(this.quality);
    this.io.observe(act.host);
  }

  private activate(act: Act | null) {
    if (this.active) this.ro.unobserve(this.active.host);
    this.active = act;
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
    act.update(time);
    if (!act.ready()) return;
    this.renderer.render(act.scene, act.camera);
    if (!this.shown) { this.shown = true; this.canvas.classList.add('is-on'); }

    // frame-time watchdog (skips the first frames: shader compile, texture uploads)
    if (++this.frames > 30) {
      this.slowSum += Math.min(deltaMs, 100);
      if (this.frames === 30 + SAMPLE_FRAMES) {
        if (this.slowSum / SAMPLE_FRAMES > SLOW_FRAME_MS) this.downgrade();
        this.frames = 0;
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

  private fail = () => { this.dispose(); this.onFail(); };

  dispose = () => {
    gsap.ticker.remove(this.tick);
    this.running = false;
    this.io.disconnect();
    this.ro.disconnect();
    document.removeEventListener('visibilitychange', this.sync);
    window.removeEventListener('pagehide', this.dispose);
    this.canvas.removeEventListener('webglcontextlost', this.fail);
    this.acts.forEach((a) => a.dispose());
    this.acts.clear();
    this.active = null;
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  };
}
