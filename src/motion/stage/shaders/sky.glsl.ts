/**
 * Act "sky" — Services page, "The sky of services". Four programs, all additive over one full-screen backdrop:
 *   backdrop   twilight → night gradient, a Milky Way band (fbm + dust lanes), a faint aurora, two layers of
 *              procedural pin-point stars, vignette and grain. Pans slowly with the camera (parallax).
 *   field      2600 point stars in depth (real parallax when the camera flies), each with its own twinkle
 *   lines      instanced quads, one per constellation line: drawn star to star (`uDraw` per group), soft glow,
 *              dashes for a route, a pulse that runs toward a lit star. Group 4 = the arcs and ring of the finale.
 *   stars      instanced quads, one per star: core + halo (the bloom) + diffraction spikes, twinkle; stars fly
 *              from their scattered place to their constellation (`uAssemble`).
 * Colours are display-space values read from the tokens (acts/util.ts token()); no hex here.
 */
const noise = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < OCT; i++) { v += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; }
    return v;
  }
`;

export const backdropVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const backdropFragment = /* glsl */ `
  precision highp float;
  #define OCT 6
  uniform vec2 uRes, uPan;
  uniform float uTime, uNight, uGrain, uBlack, uStars;
  uniform vec3 uTop, uLow, uGlow, uDust, uAuroraA, uAuroraB;
  varying vec2 vUv;
  ${noise}

  // one pin-point star per cell (some cells are empty), twinkling
  float starLayer(vec2 p, float keep, float t) {
    vec2 i = floor(p), f = fract(p);
    float r = hash(i);
    if (r < keep) return 0.0;
    vec2 c = vec2(hash(i + 1.7), hash(i + 3.1)) * 0.7 + 0.15;
    float d = length(f - c);
    float tw = 0.55 + 0.45 * sin(t * (0.7 + r * 2.6) + r * 40.0);
    return smoothstep(0.11, 0.0, d) * (r - keep) / (1.0 - keep) * tw;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
    vec2 sp = p + uPan;                                         // sky coordinates: drift with the camera

    // twilight → night: a warm glow low on the screen that fades as the page goes on
    vec3 col = mix(uLow, uTop, smoothstep(0.0, 1.0, vUv.y));
    float glow = exp(-vUv.y * 4.2) * (1.0 - 0.8 * uNight);
    col += uGlow * glow * 0.3;

    // the Milky Way: a tilted band of fbm light with darker dust lanes
    vec2 q = mat2(0.85, -0.53, 0.53, 0.85) * sp;
    float band = exp(-pow(q.y * 2.0 + 0.22 * sin(q.x * 1.4), 2.0));
    float cloud = fbm(q * 2.6 + vec2(uTime * 0.003, 0.0));
    float lanes = fbm(q * 5.5 + 7.3);
    float mw = band * smoothstep(0.32, 0.92, cloud) * (1.0 - 0.75 * smoothstep(0.48, 0.74, lanes));
    col += uDust * mw * (0.16 + 0.12 * uNight);
    col += uDust * band * 0.035;

    // a faint aurora high in the sky: soft vertical curtains that sway
    float sway = fbm(vec2(sp.x * 1.6 + uTime * 0.018, uTime * 0.025));
    float streak = pow(noise(vec2(sp.x * 16.0 + sway * 5.0, uTime * 0.05)), 2.5);
    float curtain = smoothstep(0.5, 0.86, vUv.y) * (1.0 - smoothstep(0.9, 1.0, vUv.y)) * smoothstep(0.3, 0.7, sway);
    col += mix(uAuroraA, uAuroraB, smoothstep(0.2, 0.8, vUv.x + 0.2 * sway)) * curtain * (0.25 + 0.75 * streak) * 0.09 * (0.4 + 0.6 * uNight);

    // pin-point stars (behind the field stars), denser inside the band
    float s = starLayer(sp * 70.0, 0.9 - 0.06 * band, uTime) + 0.7 * starLayer(sp * 130.0 + 11.0, 0.93 - 0.05 * band, uTime * 1.3);
    col += vec3(s) * (0.55 + 0.45 * uNight) * uStars;

    col *= 1.0 - 0.38 * pow(length(vUv - 0.5) * 1.3, 2.4);    // vignette
    col += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.024 * uGrain;   // film grain
    gl_FragColor = vec4(col * (1.0 - uBlack), 1.0);
  }
`;

export const fieldVertex = /* glsl */ `
  attribute vec4 aMeta;          // size (px), brightness, phase, colour temperature (0 warm … 1 cool)
  uniform float uTime, uPx, uFade;
  varying float vB, vT;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.62 + 0.38 * sin(uTime * (0.5 + aMeta.z * 2.2) + aMeta.z * 50.0);
    vB = aMeta.y * tw * uFade;
    vT = aMeta.w;
    gl_PointSize = aMeta.x * uPx;
  }
`;

export const fieldFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uWarm, uCool;
  varying float vB, vT;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    a *= a;
    gl_FragColor = vec4(mix(uWarm, uCool, vT) * a * vB, 1.0);
  }
`;

export const lineVertex = /* glsl */ `
  attribute vec3 aA, aB;         // the two stars (world)
  attribute vec4 aSeg;           // group (0…3 areas, 4 finale), t0, t1 (its share of the group's draw), dash
  attribute vec3 aColor;
  attribute vec2 aStars;         // star numbers at A and B (-1 = none): a lit star pulls a pulse along its lines
  uniform float uDraw[5], uLit[5];
  uniform vec2 uRes;
  uniform float uPx, uWidth, uHot, uTime;
  varying vec3 vColor;
  varying float vAcross, vAlong, vLen, vLit, vHead, vPulse, vDash;
  void main() {
    int g = int(aSeg.x + 0.5);
    float d = clamp((uDraw[g] - aSeg.y) / max(aSeg.z - aSeg.y, 0.0001), 0.0, 1.0);
    vec4 ca = projectionMatrix * modelViewMatrix * vec4(aA, 1.0);
    vec4 cb = projectionMatrix * modelViewMatrix * vec4(mix(aA, aB, d), 1.0);
    vec2 sa = ca.xy / ca.w * uRes * 0.5, sb = cb.xy / cb.w * uRes * 0.5;     // device pixels from the centre
    vec2 dir = sb - sa;
    float len = length(dir);
    dir = len > 0.001 ? dir / len : vec2(1.0, 0.0);
    // stop short of the star cores (no gap at the head while it is still drawing)
    float gapA = aSeg.x > 3.5 ? 0.0 : 9.0 * uPx, gapB = d < 1.0 || aSeg.x > 3.5 ? 0.0 : 9.0 * uPx;
    float inner = max(len - gapA - gapB, 0.0);
    float half_ = uWidth * uPx * 3.0;                                          // quad = 6 × the line: room for the glow
    vec2 s = sa + dir * (gapA + position.x * inner) + vec2(-dir.y, dir.x) * position.y * half_;
    gl_Position = vec4(s / (uRes * 0.5), 0.0, 1.0);
    vColor = aColor;
    vAcross = position.y;
    vAlong = position.x;
    vLen = inner;
    vLit = uLit[g] * step(0.001, d) * step(0.5, inner);
    vHead = d < 1.0 ? 1.0 : 0.0;
    vDash = aSeg.w;
    // a pulse runs toward the lit star (from A to B if B is lit, the other way if A is)
    float hot = step(-0.5, uHot);                                // -1 = no star lit (minor stars are -1 too)
    float toB = hot * step(abs(aStars.y - uHot), 0.5), toA = hot * step(abs(aStars.x - uHot), 0.5);
    float t = fract(uTime * 0.85);
    vPulse = toB > 0.5 ? t : toA > 0.5 ? 1.0 - t : -9.0;
  }
`;

export const lineFragment = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vAcross, vAlong, vLen, vLit, vHead, vPulse, vDash;
  uniform float uPx;
  void main() {
    float x = vAcross * 3.0;                                    // 1 = the line's own half width
    float core = exp(-x * x * 1.6);
    float glow = exp(-x * x * 0.18) * 0.22;
    float dash = vDash > 0.5 ? smoothstep(0.35, 0.5, abs(fract(vAlong * vLen / (16.0 * uPx)) - 0.5) * 2.0) : 1.0;
    float head = vHead * exp(-pow((1.0 - vAlong) * vLen / (10.0 * uPx), 2.0)) * 1.3;
    float pulse = vPulse > -1.0 ? exp(-pow((vAlong - vPulse) * vLen / (22.0 * uPx), 2.0)) * 2.2 : 0.0;
    float a = ((core + glow) * dash * 0.85 + head * (core * 1.2 + glow) + pulse * (core + glow * 2.0)) * vLit;
    gl_FragColor = vec4(vColor * a, 1.0);
  }
`;

export const starVertex = /* glsl */ `
  attribute vec3 aFrom, aTo;     // scattered place, place in the constellation (world)
  attribute vec4 aMeta;          // group (0…3, 4 = the centre star), star number (-1 = a minor star), size (px), phase
  uniform float uAssemble, uTime, uPx, uRef, uHot, uHover, uCentre;
  uniform float uLit[5];
  uniform vec3 uColor[5];
  uniform vec2 uRes;
  varying vec2 vQ;
  varying vec3 vCol;
  varying float vB, vSpike;
  void main() {
    int g = int(aMeta.x + 0.5);
    float k = clamp(uAssemble * 1.35 - aMeta.w * 0.35, 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);
    vec3 p = mix(aFrom, aTo, k);
    p.z += sin(k * 3.14159) * 0.6;                              // a slight arc toward the camera on the way
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;
    float svc = aMeta.y;
    float lit = uLit[g];
    float on = svc > -0.5 ? max(1.0 - step(0.5, abs(svc - uHot)), 1.0 - step(0.5, abs(svc - uHover))) : 0.0;
    float size = aMeta.z * uPx * clamp(uRef / -mv.z, 0.55, 2.4) * (1.0 + 0.8 * on);
    if (g == 4) size *= uCentre;
    clip.xy += position.xy * size / uRes * clip.w;
    gl_Position = clip;
    vQ = position.xy;
    float tw = 0.8 + 0.2 * sin(uTime * (1.2 + aMeta.w * 2.4) + aMeta.w * 31.0);
    vB = (svc > -0.5 ? 1.0 : 0.6) * mix(0.16, 1.0, lit) * tw * mix(0.6, 1.0, k) + on * 0.9;
    if (g == 4) vB = uCentre * (0.9 + 0.1 * tw);
    vCol = mix(vec3(1.0), uColor[g], g == 4 ? 0.55 : svc > -0.5 ? 0.32 : 0.5);
    vSpike = g == 4 ? 1.4 : (svc > -0.5 ? 0.55 : 0.12) * lit + on;
  }
`;

export const starFragment = /* glsl */ `
  precision highp float;
  varying vec2 vQ;
  varying vec3 vCol;
  varying float vB, vSpike;
  void main() {
    float r = length(vQ);
    float core = exp(-r * r * 120.0) * 1.8;
    float halo = exp(-r * 7.0) * 0.4 + exp(-r * r * 14.0) * 0.18;          // the bloom
    float spikes = (exp(-abs(vQ.x) * 70.0) * exp(-abs(vQ.y) * 4.0) + exp(-abs(vQ.y) * 70.0) * exp(-abs(vQ.x) * 4.0)) * vSpike * 0.6;
    float i = (core + halo + spikes) * vB * (1.0 - smoothstep(0.82, 1.0, r));
    gl_FragColor = vec4(mix(vCol, vec3(1.0), core * 0.4) * i, 1.0);
  }
`;
