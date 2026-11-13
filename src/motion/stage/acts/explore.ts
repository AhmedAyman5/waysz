/**
 * Act "explore" — Immigration page, "Explore the world": the night Earth of Home §1.5 (same map, same halo,
 * same arcs) made interactive. Country borders (Natural Earth, Egypt point of view — lib/borders.ts) are drawn
 * on it; the visitor turns it freely, hovers and selects countries; on select the globe follows an amber plane
 * along a glowing arc from Egypt to the country.
 * The DOM scene (scenes/explore-globe.ts) owns pointer events and text and drives this act through
 * `ExploreControls` (stage/bridge.ts). Nothing here is content: names and the welcome message are HTML.
 * No depth buffer on the shared renderer: draw order = renderOrder, far-side parts fade themselves out.
 */
import { gsap } from 'gsap';
import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, CircleGeometry,
  DoubleSide, Group, LinearFilter, LineSegments, Matrix4, Mesh, MeshBasicMaterial, NormalBlending, PerspectiveCamera, Points,
  PointsMaterial, Quaternion, RingGeometry, Scene, ShaderMaterial, ShapeUtils, SphereGeometry, TextureLoader,
  TubeGeometry, Vector2, Vector3, type Texture,
} from 'three';
import type { Act, Quality } from '../stage';
import type { ExploreControls } from '../bridge';
import { countryAt, type Borders, type Country, type Ring } from '../../../lib/borders';
import { arcFragment, arcVertex, globeVertex, haloFragment } from '../shaders/globe.glsl';
import { exploreFragment, fillFragment, surfaceFragment, surfaceVertex } from '../shaders/explore.glsl';
import { onSphere, rad, slerp } from './globe';
import { token } from './util';

const FOV = 28;
const ORIGIN: [number, number] = [30.0, 31.2];            // lat, lon — Egypt: every flight starts here
const ZOOM_MAX = 2.1;
const STEP = 2.5;                                            // degrees: longest straight piece drawn on the sphere
const LAT_MAX = rad(72);
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
/** shortest way round from angle a to angle b */
const turnTo = (a: number, b: number) => a + ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;

export function createExploreAct(
  host: HTMLElement, quality: Quality, borders: Borders, selectable: (id: string) => boolean,
): Act & { controls: ExploreControls } {
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  const navy = token('--color-bg', host);
  const amber = token('--color-accent', host);
  const sky = token('--color-focus', host, ['--color-ink-muted', 55]);
  const ink = token('--color-ink', host);
  const lin = (c: typeof navy) => c.clone().convertSRGBToLinear();
  scene.background = lin(navy);

  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };
  const flat = { depthTest: false, depthWrite: false } as const;
  const fade = { value: 0 };
  const time = { value: 0 };
  const center = { value: new Vector3() };
  const horizon = { value: 0.2 };
  const sunDir = { value: new Vector3(-0.75, 0.35, 0.55).normalize() };

  // ---------- stars ----------
  const starCount = quality === 'high' ? 800 : 400;
  const starPos = new Float32Array(starCount * 3);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < starCount; i++) {
    const v = new Vector3(rnd() * 2 - 1, rnd() * 2 - 1, -rnd()).normalize().multiplyScalar(40);
    starPos.set([v.x, v.y, v.z], i * 3);
  }
  const starGeo = keep(new BufferGeometry());
  starGeo.setAttribute('position', new BufferAttribute(starPos, 3));
  const starMat = keep(new PointsMaterial({ color: lin(ink), size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, ...flat }));
  const stars = new Points(starGeo, starMat);
  stars.renderOrder = 0;
  stars.frustumCulled = false;
  scene.add(stars);

  // ---------- globe ----------
  const globe = new Group();                     // position + zoom
  scene.add(globe);
  const turn = new Group();                      // everything that turns with the Earth
  globe.add(turn);

  // land mask: the border polygons painted on an equirectangular canvas
  const W = quality === 'high' ? 2048 : 1024, H = W / 2;
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = W; maskCanvas.height = H;
  const ctx = maskCanvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  for (const c of borders.countries) {
    ctx.beginPath();
    for (const poly of c.polys) for (const r of poly) {
      for (let i = 0; i < r.length; i += 2) {
        const x = ((r[i] + 180) / 360) * W, y = ((90 - r[i + 1]) / 180) * H;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath();
    }
    ctx.fill('evenodd');
  }
  const land = keep(new CanvasTexture(maskCanvas));
  land.minFilter = land.magFilter = LinearFilter;
  land.generateMipmaps = false;

  let map: Texture | null = null;
  let ready = false;
  const segments = quality === 'high' ? 96 : 56;
  const sphereGeo = keep(new SphereGeometry(1, segments, segments / 2));
  const globeMat = keep(new ShaderMaterial({
    vertexShader: globeVertex, fragmentShader: exploreFragment, ...flat,
    uniforms: { uMap: { value: null }, uLand: { value: land }, uAmber: { value: amber }, uNavy: { value: navy }, uSky: { value: sky }, uSunDir: sunDir, uFade: fade },
  }));
  new TextureLoader().load(`/media/img/earth-night${quality === 'high' ? '' : '-m'}.webp`, (t) => {
    t.minFilter = t.magFilter = LinearFilter;
    t.generateMipmaps = false;
    map = t;
    globeMat.uniforms.uMap.value = t;
    ready = true;
    gsap.to(fade, { value: 1, duration: 1.4, ease: 'power2.out' });
  });
  const earth = new Mesh(sphereGeo, globeMat);
  earth.renderOrder = 2;
  turn.add(earth);

  const haloMat = keep(new ShaderMaterial({
    vertexShader: globeVertex, fragmentShader: haloFragment, side: BackSide, transparent: true, blending: AdditiveBlending, ...flat,
    uniforms: { uSky: { value: sky }, uAmber: { value: amber }, uSunDir: sunDir, uFade: fade },
  }));
  const halo = new Mesh(sphereGeo, haloMat);
  halo.scale.setScalar(1.13);
  halo.renderOrder = 1;
  globe.add(halo);

  // ---------- borders: every arc of the topology once, as line segments on the surface ----------
  // lines add light; fills are painted over the land (normal blending keeps the amber saturated on the blue)
  const surfaceMat = (color: typeof navy, alpha: number, solid = false) => keep(new ShaderMaterial({
    vertexShader: surfaceVertex, fragmentShader: solid ? fillFragment : surfaceFragment, transparent: true,
    blending: solid ? NormalBlending : AdditiveBlending, side: DoubleSide, ...flat,
    uniforms: { uColor: { value: color }, uAlpha: { value: alpha }, uCenter: center, uHorizon: horizon, uFade: fade },
  }));
  const put = (out: number[], lon: number, lat: number, r: number) => {
    const c = Math.cos(rad(lat));
    out.push(r * c * Math.cos(rad(lon)), r * Math.sin(rad(lat)), -r * c * Math.sin(rad(lon)));
  };
  const segmentsOf = (rings: Ring[], r: number) => {
    const out: number[] = [];
    for (const ring of rings) for (let i = 0; i + 3 < ring.length; i += 2) {
      // a long straight border (a parallel, a meridian) must follow the sphere, not cut through it
      const x0 = ring[i], y0 = ring[i + 1], x1 = ring[i + 2], y1 = ring[i + 3];
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / STEP));
      for (let k = 0; k < n; k++) {
        put(out, x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, r);
        put(out, x0 + ((x1 - x0) * (k + 1)) / n, y0 + ((y1 - y0) * (k + 1)) / n, r);
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(out), 3));
    return geo;
  };
  const lineColor = sky.clone().lerp(ink, 0.35);
  const borderLines = new LineSegments(keep(segmentsOf(borders.lines, 1.0012)), surfaceMat(lineColor, 0.34));
  borderLines.renderOrder = 3;
  borderLines.frustumCulled = false;
  turn.add(borderLines);

  // ---------- country fills (hover, selected) + the selected outline ----------
  const fills = new Map<string, BufferGeometry>();
  /** a flat triangle between far-apart points would cut through the sphere: halve its longest side until it is small */
  const split = (out: number[], ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
    const ab = Math.max(Math.abs(bx - ax), Math.abs(by - ay)), bc = Math.max(Math.abs(cx - bx), Math.abs(cy - by)), ca = Math.max(Math.abs(ax - cx), Math.abs(ay - cy));
    if (Math.max(ab, bc, ca) <= STEP * 2) { put(out, ax, ay, 1.0006); put(out, bx, by, 1.0006); put(out, cx, cy, 1.0006); return; }
    if (ab >= bc && ab >= ca) { const mx = (ax + bx) / 2, my = (ay + by) / 2; split(out, ax, ay, mx, my, cx, cy); split(out, mx, my, bx, by, cx, cy); }
    else if (bc >= ca) { const mx = (bx + cx) / 2, my = (by + cy) / 2; split(out, ax, ay, bx, by, mx, my); split(out, ax, ay, mx, my, cx, cy); }
    else { const mx = (cx + ax) / 2, my = (cy + ay) / 2; split(out, ax, ay, bx, by, mx, my); split(out, mx, my, bx, by, cx, cy); }
  };
  const fillOf = (c: Country) => {
    let geo = fills.get(c.id);
    if (geo) return geo;
    const pos: number[] = [];
    for (const poly of c.polys) {
      const pts = (r: Ring) => {
        const n = r.length / 2 - (r[0] === r[r.length - 2] && r[1] === r[r.length - 1] ? 1 : 0);
        return Array.from({ length: n }, (_, i) => new Vector2(r[i * 2], r[i * 2 + 1]));
      };
      const outer = pts(poly[0]), holes = poly.slice(1).map(pts);
      if (outer.length < 3) continue;
      const all = outer.concat(...holes);
      for (const [a, b, c] of ShapeUtils.triangulateShape(outer, holes)) split(pos, all[a].x, all[a].y, all[b].x, all[b].y, all[c].x, all[c].y);
    }
    geo = keep(new BufferGeometry());
    geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    fills.set(c.id, geo);
    return geo;
  };
  const empty = keep(new BufferGeometry());
  empty.setAttribute('position', new BufferAttribute(new Float32Array(9), 3));
  const hoverMat = surfaceMat(sky.clone().lerp(ink, 0.55), 0, true);
  const hoverFill = new Mesh(empty, hoverMat);
  const selMat = surfaceMat(amber, 0, true);
  const selFill = new Mesh(empty, selMat);
  const selLineMat = surfaceMat(amber.clone().lerp(ink, 0.25), 0);
  let selLines = new LineSegments(empty, selLineMat);
  [hoverFill, selFill, selLines].forEach((m, i) => { m.renderOrder = 4 + i; m.frustumCulled = false; turn.add(m); });
  let hoverId: string | null = null, selectedId: string | null = null;
  let selLineGeo: BufferGeometry | null = null;

  // ---------- the route: arc + plane + marks ----------
  const arcMat = (alpha: number) => keep(new ShaderMaterial({
    vertexShader: arcVertex, fragmentShader: arcFragment, transparent: true, blending: AdditiveBlending, ...flat,
    uniforms: {
      uColor: { value: amber }, uCenter: center, uHead: { value: 0 }, uAge: { value: 0 },
      uAlpha: { value: alpha }, uPulse: { value: 0 }, uTime: time, uFade: fade,
    },
  }));
  const coreMat = arcMat(1), glowMat = arcMat(0.14);
  const core = new Mesh(empty, coreMat), glow = new Mesh(empty, glowMat);
  core.renderOrder = glow.renderOrder = 7;
  core.frustumCulled = glow.frustumCulled = false;
  core.visible = glow.visible = false;
  turn.add(glow, core);
  let curve: CatmullRomCurve3 | null = null;
  let arcGeos: BufferGeometry[] = [];

  const ringGeo = keep(new RingGeometry(0.02, 0.027, 32));
  const dotGeo = keep(new CircleGeometry(0.01, 16));
  const out = new Vector3(0, 0, 1);
  const mark = (p: Vector3) => {
    const mat = keep(new MeshBasicMaterial({ color: lin(amber), transparent: true, opacity: 0, side: DoubleSide, ...flat }));
    const g = new Group();
    g.add(new Mesh(ringGeo, mat), new Mesh(dotGeo, mat));
    g.children.forEach((c) => { c.renderOrder = 8; });
    g.position.copy(p).multiplyScalar(1.004);
    g.quaternion.setFromUnitVectors(out, p.clone().normalize());
    turn.add(g);
    return { g, mat, p: p.clone(), on: 0 };
  };
  const origin = onSphere(ORIGIN[0], ORIGIN[1]);
  const home = mark(origin);
  home.on = 1;
  const dest = mark(origin);

  const planeGeo = keep(new BufferGeometry());
  planeGeo.setAttribute('position', new BufferAttribute(new Float32Array([
    1, 0, 0, -0.7, 0.62, 0, -0.36, 0, 0,
    1, 0, 0, -0.36, 0, 0, -0.7, -0.62, 0,
  ]), 3));
  const planeMat = keep(new MeshBasicMaterial({ color: lin(amber.clone().lerp(ink, 0.35)), transparent: true, opacity: 0, side: DoubleSide, ...flat }));
  const plane = new Mesh(planeGeo, planeMat);
  plane.renderOrder = 9;
  plane.matrixAutoUpdate = false;
  plane.frustumCulled = false;
  turn.add(plane);

  // ---------- state ----------
  let aspect = 1, hostW = 1, hostH = 1;
  let side: 1 | -1 = 1, compact = false;
  let viewLon = rad(ORIGIN[1] - 8), viewLat = rad(18);       // where the globe faces (radians)
  let vLon = 0, vLat = 0;                                    // inertia (rad/s)
  let zoom = 1, zoomTo = 1;
  let auto = true, follow = false;
  const flight = { head: 0, plane: 0, land: 0 };
  let tl: gsap.core.Timeline | null = null;
  const hh = () => (compact ? 1.1 : 1.24);                   // half of the visible height at the globe, in globe radii

  const layout = () => {
    camera.position.set(0, 0, hh() / Math.tan(rad(FOV / 2)));
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    globe.position.set(compact ? 0 : side * 0.27 * aspect * hh(), compact ? 0 : -0.02, 0);
    center.value.copy(globe.position);
  };
  const pxPerRadius = () => (hostH / 2 / hh()) * zoom;

  const headPoint = new Vector3(), tangent = new Vector3(), normal = new Vector3(), sideV = new Vector3();
  const basis = new Matrix4(), scale = new Matrix4();
  const world = new Vector3(), toCam = new Vector3(), q = new Quaternion();
  const ray = new Vector3(), oc = new Vector3();

  /** host px → lon/lat (degrees) on the globe, or null when the point misses it */
  const locate = (x: number, y: number): [number, number] | null => {
    const nx = (x / hostW) * 2 - 1, ny = -((y / hostH) * 2 - 1);
    ray.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize();
    oc.copy(camera.position).sub(globe.position);
    const b = oc.dot(ray), c = oc.dot(oc) - zoom * zoom;
    const disc = b * b - c;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    world.copy(camera.position).addScaledVector(ray, t).sub(globe.position).divideScalar(zoom);
    world.applyQuaternion(q.copy(turn.quaternion).invert());
    return [(Math.atan2(-world.z, world.x) * 180) / Math.PI, (Math.asin(clamp(world.y, -1, 1)) * 180) / Math.PI];
  };

  const setHover = (id: string | null) => {
    if (id === hoverId) return;
    hoverId = id;
    const c = id && id !== selectedId ? borders.byId.get(id) : null;
    gsap.killTweensOf(hoverMat.uniforms.uAlpha);
    if (c) {
      hoverFill.geometry = fillOf(c);
      hoverMat.uniforms.uAlpha.value = 0.05;
      gsap.to(hoverMat.uniforms.uAlpha, { value: 0.3, duration: 0.25, ease: 'power2.out' });
    } else hoverMat.uniforms.uAlpha.value = 0;
  };

  const controls: ExploreControls = {
    pick(x, y) {
      const at = locate(x, y);
      if (!at) return null;
      const c = countryAt(borders, at[0], at[1], 1.4 / zoom);
      return c && selectable(c.id) ? c.id : null;
    },
    hover: setHover,
    drag(dx, dy) {
      const k = 1 / pxPerRadius();
      viewLon -= dx * k;
      viewLat = clamp(viewLat + dy * k, -LAT_MAX, LAT_MAX);
      vLon = vLat = 0;
      follow = false;
    },
    release(vx, vy) {
      const k = 1 / pxPerRadius();
      vLon = clamp(-vx * k, -4, 4);
      vLat = clamp(vy * k, -3, 3);
    },
    zoom(factor) { zoomTo = clamp(zoomTo * factor, 1, ZOOM_MAX); },
    setAuto(on) { auto = on; },
    setLayout(s, c) { side = s; compact = c; layout(); },
    flyTo(id, onLand) {
      const c = borders.byId.get(id);
      if (!c) { onLand(); return; }
      tl?.kill();
      setHover(null);
      selectedId = id;
      auto = false;
      vLon = vLat = 0;

      const target = onSphere(c.label[1], c.label[0]);
      const angle = origin.angleTo(target);
      const lift = 0.06 + 0.26 * (angle / Math.PI);
      curve = new CatmullRomCurve3(Array.from({ length: 41 }, (_, i) => {
        const t = i / 40;
        return slerp(origin, target, t).multiplyScalar(1 + lift * Math.sin(Math.PI * t));
      }));
      arcGeos.forEach((g) => g.dispose());
      arcGeos = [new TubeGeometry(curve, 96, 0.0042, 6), new TubeGeometry(curve, 64, 0.014, 6)];
      core.geometry = arcGeos[0];
      glow.geometry = arcGeos[1];
      core.visible = glow.visible = true;

      selFill.geometry = fillOf(c);
      selLineGeo?.dispose();
      selLineGeo = segmentsOf(c.polys.flat(), 1.002);
      selLines.geometry = selLineGeo;
      dest.p.copy(target);
      dest.g.position.copy(target).multiplyScalar(1.004);
      dest.g.quaternion.setFromUnitVectors(out, target.clone().normalize());

      // small countries get a closer look when the plane lands
      const fit = clamp(22 / Math.max(c.span, 6), 1, compact ? 1.3 : 1.55);
      const dur = 1.5 + 1.9 * (angle / Math.PI);
      flight.head = 0; flight.land = 0;
      coreMat.uniforms.uAge.value = glowMat.uniforms.uAge.value = 0;
      selMat.uniforms.uAlpha.value = selLineMat.uniforms.uAlpha.value = 0;
      dest.on = 0;
      follow = true;
      zoomTo = Math.min(zoomTo, 1.15);
      tl = gsap.timeline()
        .to(flight, { plane: 1, duration: 0.4, ease: 'power1.out' }, 0.25)                 // the globe turns to Egypt first
        .to(flight, { head: 1, duration: dur, ease: 'power2.inOut' }, 0.55)
        .to(selLineMat.uniforms.uAlpha, { value: 0.9, duration: 0.6, ease: 'power2.out' }, 0.55 + dur * 0.72)
        .add(() => { zoomTo = fit; }, 0.55 + dur * 0.6)
        .to(selMat.uniforms.uAlpha, { value: 0.62, duration: 0.7, ease: 'power2.out' }, 0.55 + dur - 0.1)
        .to(flight, { land: 1, duration: 1.1, ease: 'expo.out' }, 0.55 + dur - 0.05)
        .to(flight, { plane: 0, duration: 0.5, ease: 'power1.in' }, 0.55 + dur + 0.1)
        .to([coreMat.uniforms.uAge, glowMat.uniforms.uAge], { value: 0.9, duration: 1.6, ease: 'power1.out' }, 0.55 + dur)   // the trail cools down
        .add(onLand, 0.55 + dur);
    },
  };

  return {
    host,
    scene,
    camera,
    controls,
    ready: () => ready,
    update(t, deltaMs) {
      const dt = Math.min(deltaMs, 100) / 1000;
      time.value = t;
      starMat.opacity = 0.5 * fade.value;

      // where the globe faces: the flight, then inertia, then a slow idle turn
      if (follow && curve) {
        curve.getPointAt(clamp(flight.head, 0, 1), headPoint);
        normal.copy(headPoint).normalize();
        const k = 1 - Math.exp(-dt / 0.38);
        viewLon += (turnTo(viewLon, Math.atan2(-normal.z, normal.x)) - viewLon) * k;
        viewLat += (clamp(Math.asin(normal.y), -LAT_MAX, LAT_MAX) - viewLat) * k;
      } else {
        viewLon += vLon * dt;
        viewLat = clamp(viewLat + vLat * dt, -LAT_MAX, LAT_MAX);
        const drag = Math.exp(-dt * 2.6);
        vLon *= drag; vLat *= drag;
        if (auto && Math.abs(vLon) < 0.02) viewLon += dt * 0.045;
      }
      zoom += (zoomTo - zoom) * (1 - Math.exp(-dt / 0.3));
      layout();
      globe.scale.setScalar(zoom);
      turn.rotation.set(viewLat, -Math.PI / 2 - viewLon, 0);
      globe.updateMatrixWorld();
      horizon.value = zoom / camera.position.distanceTo(globe.position);
      toCam.copy(camera.position).sub(globe.position).normalize();

      // the route
      if (curve) {
        const head = clamp(flight.head, 0, 1);
        coreMat.uniforms.uHead.value = glowMat.uniforms.uHead.value = head;
        curve.getPointAt(head, headPoint);
        curve.getTangentAt(head, tangent);
        normal.copy(headPoint).normalize();
        sideV.crossVectors(normal, tangent).normalize();
        const s = 0.034 / Math.sqrt(zoom);
        scale.makeScale(s, s, s);
        basis.makeBasis(tangent, sideV, normal).setPosition(headPoint.x * 1.006, headPoint.y * 1.006, headPoint.z * 1.006);
        plane.matrix.multiplyMatrices(basis, scale);
      }
      planeMat.opacity = flight.plane * fade.value;

      // marks: Egypt always, the destination once the plane has landed (one ripple, then a calm pulse)
      const facing = (p: Vector3) => {
        world.copy(p).applyQuaternion(turn.quaternion);
        return clamp((world.dot(toCam) - horizon.value) / 0.2, 0, 1);
      };
      home.mat.opacity = facing(home.p) * fade.value * 0.95;
      home.g.scale.setScalar((1 + Math.sin(t * 2.2) * 0.06) / Math.sqrt(zoom));
      dest.mat.opacity = flight.land * facing(dest.p) * fade.value;
      dest.g.scale.setScalar((2.4 - 1.2 * flight.land + (flight.land > 0.95 ? Math.sin(t * 2.6) * 0.07 : 0)) / Math.sqrt(zoom));
    },
    resize(width, height) {
      aspect = width / Math.max(height, 1);
      hostW = host.clientWidth || 1;
      hostH = host.clientHeight || 1;
      layout();
    },
    setQuality() { /* geometry and texture sizes are fixed when the act is created */ },
    dispose() {
      tl?.kill();
      gsap.killTweensOf([fade, flight]);
      disposables.forEach((d) => d.dispose());
      arcGeos.forEach((g) => g.dispose());
      selLineGeo?.dispose();
      map?.dispose();
    },
  };
}
