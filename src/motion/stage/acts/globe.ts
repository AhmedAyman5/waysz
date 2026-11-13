/**
 * Act "globe" — Home §1.5: the night side of the Earth (NASA Black Marble) with a route that leaves Egypt.
 * Scroll (scenes/globe-route.ts → bridge.route) flies the plane through four stops; the globe turns to
 * follow it. Stops are unlabeled and decorative — they are not a list of destinations WaysZ serves.
 * No depth buffer on the shared renderer: draw order is fixed with renderOrder, far-side parts fade out.
 */
import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, CatmullRomCurve3, CircleGeometry, DoubleSide,
  Group, LinearFilter, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Points, PointsMaterial,
  RingGeometry, Scene, ShaderMaterial, SphereGeometry, TextureLoader, TubeGeometry, Vector3,
  type Material, type Texture,
} from 'three';
import type { Act, Quality } from '../stage';
import { route } from '../bridge';
import { arcFragment, arcVertex, globeFragment, globeVertex, haloFragment } from '../shaders/globe.glsl';
import { token } from './util';

const rad = (d: number) => (d * Math.PI) / 180;
/** lat/lon → point on the unit sphere, matching three's SphereGeometry UVs for an equirectangular map */
const onSphere = (lat: number, lon: number, r = 1) => {
  const phi = rad(lon + 180), theta = rad(90 - lat);
  return new Vector3(-r * Math.sin(theta) * Math.cos(phi), r * Math.cos(theta), r * Math.sin(theta) * Math.sin(phi));
};
const slerp = (a: Vector3, b: Vector3, t: number) => {
  const w = a.angleTo(b), s = Math.sin(w);
  return a.clone().multiplyScalar(Math.sin((1 - t) * w) / s).addScaledVector(b, Math.sin(t * w) / s);
};

// [lat, lon] — the route starts in Egypt; the other points only shape a pleasing flight over lit land
const STOPS: [number, number][] = [[30.0, 31.2], [25.2, 55.3], [13.7, 100.5], [35.7, 139.7]];
const AMBIENT: [number, number][] = [[48.8, 2.3], [51.5, -0.1], [40.7, -74.0], [-26.2, 28.0], [55.7, 37.6], [-33.9, 151.2], [6.5, 3.4]];
const FOV = 28;

export function createGlobeAct(host: HTMLElement, quality: Quality): Act {
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  const navy = token('--color-bg', host);
  const amber = token('--color-accent', host);
  const sky = token('--color-focus', host, ['--color-ink-muted', 55]);
  const ink = token('--color-ink', host);
  // Built-in materials and the background are colour-managed (linear in, sRGB out); our own shaders are not.
  const lin = (c: typeof navy) => c.clone().convertSRGBToLinear();
  scene.background = lin(navy);

  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };
  const flat = { depthTest: false, depthWrite: false } as const;
  const fade = { value: 0 };
  const time = { value: 0 };
  const center = { value: new Vector3() };
  const sunDir = { value: new Vector3(-0.75, 0.35, 0.55).normalize() };

  // stars — a still backdrop
  const starCount = quality === 'high' ? 700 : 350;
  const starPos = new Float32Array(starCount * 3);
  let seed = 7;
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

  // globe + atmosphere
  const globe = new Group();
  scene.add(globe);
  const turn = new Group();                      // everything that turns with the Earth
  globe.add(turn);

  let map: Texture | null = null;
  let ready = false;
  const segments = quality === 'high' ? 72 : 48;
  const sphereGeo = keep(new SphereGeometry(1, segments, segments / 2));
  const globeMat = keep(new ShaderMaterial({
    vertexShader: globeVertex, fragmentShader: globeFragment, ...flat,
    uniforms: { uMap: { value: null }, uAmber: { value: amber }, uNavy: { value: navy }, uSky: { value: sky }, uSunDir: sunDir, uFade: fade },
  }));
  new TextureLoader().load(`/media/img/earth-night${quality === 'high' ? '' : '-m'}.webp`, (t) => {
    t.minFilter = t.magFilter = LinearFilter;
    t.generateMipmaps = false;
    map = t;
    globeMat.uniforms.uMap.value = t;
    ready = true;
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

  // arcs
  const arcMat = (alpha: number, pulse: number) => keep(new ShaderMaterial({
    vertexShader: arcVertex, fragmentShader: arcFragment, transparent: true, blending: AdditiveBlending, ...flat,
    uniforms: {
      uColor: { value: amber }, uCenter: center, uHead: { value: pulse ? 1 : 0 }, uAge: { value: pulse ? 2 : 0 },
      uAlpha: { value: alpha }, uPulse: { value: pulse }, uTime: time, uFade: fade,
    },
  }));
  const arcCurve = (a: Vector3, b: Vector3) => {
    const lift = 0.05 + 0.22 * (a.angleTo(b) / Math.PI);
    const pts = Array.from({ length: 33 }, (_, i) => {
      const t = i / 32;
      return slerp(a, b, t).multiplyScalar(1 + lift * Math.sin(Math.PI * t));
    });
    return new CatmullRomCurve3(pts);
  };
  const stops = STOPS.map(([lat, lon]) => onSphere(lat, lon));
  const curves = stops.slice(1).map((b, i) => arcCurve(stops[i], b));
  const hops = curves.map((curve) => {
    const core = new Mesh(keep(new TubeGeometry(curve, 64, 0.0045, 6)), arcMat(1, 0));
    const glow = new Mesh(keep(new TubeGeometry(curve, 48, 0.016, 6)), arcMat(0.16, 0));
    core.renderOrder = glow.renderOrder = 3;
    turn.add(glow, core);
    return [core.material, glow.material] as ShaderMaterial[];
  });
  AMBIENT.forEach(([lat, lon], i) => {
    const mesh = new Mesh(keep(new TubeGeometry(arcCurve(stops[0], onSphere(lat, lon)), 48, 0.0028, 5)), arcMat(0.3, i + 1));
    mesh.renderOrder = 3;
    turn.add(mesh);
  });

  // stops: a ring and a dot lying on the surface
  const ringGeo = keep(new RingGeometry(0.017, 0.023, 28));
  const dotGeo = keep(new CircleGeometry(0.009, 16));
  const out = new Vector3(0, 0, 1);
  const marks = stops.map((p) => {
    const mat = keep(new MeshBasicMaterial({ color: lin(amber), transparent: true, opacity: 0, side: DoubleSide, ...flat }));
    const g = new Group();
    g.add(new Mesh(ringGeo, mat), new Mesh(dotGeo, mat));
    g.position.copy(p).multiplyScalar(1.004);
    g.quaternion.setFromUnitVectors(out, p.clone().normalize());
    g.children.forEach((c) => { c.renderOrder = 4; });
    turn.add(g);
    return { g, mat, p, on: 0 };
  });

  // the plane: a small dart that rides the route
  const planeGeo = keep(new BufferGeometry());
  planeGeo.setAttribute('position', new BufferAttribute(new Float32Array([
    1, 0, 0, -0.7, 0.62, 0, -0.36, 0, 0,
    1, 0, 0, -0.36, 0, 0, -0.7, -0.62, 0,
  ]), 3));
  const planeMat = keep(new MeshBasicMaterial({ color: lin(ink), transparent: true, opacity: 0, side: DoubleSide, ...flat }));
  const plane = new Mesh(planeGeo, planeMat);
  plane.renderOrder = 5;
  plane.matrixAutoUpdate = false;
  plane.frustumCulled = false;
  turn.add(plane);

  const headPoint = new Vector3(), tangent = new Vector3(), normal = new Vector3(), side = new Vector3();
  const basis = new Matrix4(), scale = new Matrix4().makeScale(0.03, 0.03, 0.03);
  const world = new Vector3(), toCam = new Vector3();
  let rotX = rad(STOPS[0][0]) * 0.7 - 0.3, rotY = -Math.PI / 2 - rad(STOPS[0][1]);
  let aspect = 1;

  const layout = () => {
    const hh = route.compact ? 1 / (1.22 * Math.max(aspect, 0.35)) : 0.92;   // half of the visible height at the globe
    camera.position.set(0, 0, hh / Math.tan(rad(FOV / 2)));
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    if (route.poster) {                                     // dev: the still for the css tier (see waysz-media)
      camera.position.set(0, 0, 1.3 / Math.tan(rad(FOV / 2)));
      camera.updateProjectionMatrix();
      globe.position.set(0, 0, 0);
      center.value.copy(globe.position);
      return;
    }
    const rise = (1 - route.enter) * hh * 0.9;
    if (route.compact) globe.position.set(0, hh * 0.34 - rise, 0);
    else globe.position.set(route.side * 0.42 * aspect * hh, -hh * 0.3 - rise, 0);
    center.value.copy(globe.position);
  };

  return {
    host,
    scene,
    camera,
    ready: () => ready,
    update(t, deltaMs) {
      time.value = t;
      fade.value = Math.min(1, route.enter * 1.4);
      starMat.opacity = 0.55 * fade.value;
      layout();

      const head = Math.min(Math.max(route.head, 0), curves.length);
      const i = Math.min(Math.floor(head), curves.length - 1);
      const f = head - i;
      hops.forEach((mats, k) => mats.forEach((m) => {
        m.uniforms.uHead.value = Math.min(Math.max(head - k, 0), 1);
        m.uniforms.uAge.value = Math.max(head - (k + 1), 0);
      }));
      curves[i].getPointAt(f, headPoint);
      curves[i].getTangentAt(f, tangent);
      normal.copy(headPoint).normalize();
      side.crossVectors(normal, tangent).normalize();
      basis.makeBasis(tangent, side, normal).setPosition(headPoint.x * 1.006, headPoint.y * 1.006, headPoint.z * 1.006);
      plane.matrix.multiplyMatrices(basis, scale);
      planeMat.opacity = fade.value;

      // the globe turns to keep the plane in view (yaw + a little pitch, never a roll), with inertia
      const lat = Math.asin(normal.y);
      const lon = Math.atan2(-normal.z, normal.x);
      const k = 1 - Math.exp(-Math.min(deltaMs, 100) / 420);
      rotY += (-Math.PI / 2 - lon - (route.compact ? 0 : route.side * 0.24) - rotY) * k;
      rotX += (lat * 0.7 - (route.compact ? 0.1 : 0.4) - rotX) * k;   // keep the plane above the text
      turn.rotation.set(rotX, rotY + Math.sin(t * 0.07) * 0.02, 0);

      globe.updateMatrixWorld();
      toCam.copy(camera.position).sub(globe.position).normalize();
      marks.forEach((m, n) => {
        const target = head >= n - 0.02 ? 1 : 0.28;
        m.on += (target - m.on) * k * 1.6;
        world.copy(m.p).applyQuaternion(turn.quaternion);
        const facing = Math.min(Math.max((world.dot(toCam) - 0.05) / 0.2, 0), 1);
        m.mat.opacity = m.on * facing * fade.value;
        m.g.scale.setScalar(0.8 + m.on * 0.5 + (m.on > 0.9 ? Math.sin(t * 2.2 + n) * 0.06 : 0));
      });
    },
    resize(width, height) { aspect = width / Math.max(height, 1); layout(); },
    setQuality() { /* geometry and texture size are fixed when the act is created */ },
    dispose() {
      disposables.forEach((d) => d.dispose());
      (plane.material as Material).dispose();
      map?.dispose();
    },
  };
}
