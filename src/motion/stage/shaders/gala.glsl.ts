/**
 * Shaders of the act "gala" (Exhibitions & Conferences page). Two kinds:
 *   world shaders  — drawn into the act's own render target (linear light, HDR, with depth):
 *                    the velvet curtain + valance (vertex cloth), volumetric spot beams, dust in the beams, press
 *                    flashes, the LED wall, the floor-plan lines of the expo, the sound waves of the interpreters,
 *                    the seat lamps of the seat map
 *   finish shader  — puts that picture on the shared canvas: bloom from the target's own mip levels, exposure,
 *                    ACES tone mapping, the dip into the dark at a camera cut, vignette, grain (display space)
 * SPOTS = the lights every lit shader knows about: 0 the follow spot · 1–4 the moving heads · 5–8 the four beams of
 * "under one roof" (always the full set — quality policy).
 */
export const SPOTS = 9;

const spotUniforms = /* glsl */ `
uniform vec3 uSpotPos[${SPOTS}];
uniform vec3 uSpotDir[${SPOTS}];
uniform float uSpotCos[${SPOTS}];
uniform float uSpotI[${SPOTS}];
uniform vec3 uSpotCol[${SPOTS}];
`;

const noise = /* glsl */ `
float hash1(float n) { return fract(sin(n) * 43758.5453); }
float hash2(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

// ------------------------------------------------------------------------------------------------
// the curtain (uMode 0: one half of the traveller curtain · 1: the valance across the top)
// The plane's uv.x runs from the inner edge (0, the middle of the stage) to the outer edge (1); uSide mirrors it.
// Cloth = pleats along the width that deepen as the cloth bunches toward its side, a hem that lags when it moves,
// a slow breathing sway. All of it in the vertex shader, with an analytic normal.
// ------------------------------------------------------------------------------------------------
export const curtainVertex = /* glsl */ `
uniform float uSide, uOpen, uVel, uTime, uW, uY0, uH, uZ, uPleats, uMode, uSpan;
varying vec3 vWorld, vNormal;
varying vec2 vUv;
varying float vFold, vX;

void main() {
  float u = uv.x, v = uv.y;
  float xr, g;
  if (uMode < 0.5) {
    // the bottom leads a little: a drawn curtain swings, it does not slide like a door
    float o = clamp(uOpen * (1.0 + 0.12 * (0.5 - v)), 0.0, 1.0);
    o = o * o * (3.0 - 2.0 * o);
    g = mix(uW + 0.3, 2.1, o);                                     // width the half covers now
    xr = (uW - g) + u * g - 0.3 * (1.0 - o);                       // closed: the halves overlap in the middle
    xr -= uVel * 0.9 * pow(1.0 - v, 2.0) * (1.0 - u);              // the hem lags behind a moving curtain
  } else {
    g = uSpan;
    xr = (u - 0.5) * uSpan;
  }
  float compress = (uW + 0.3) / g;
  float phase = u * uPleats * 6.28318 * (uMode < 0.5 ? 1.0 : 0.5);
  float jit = sin(u * 37.0 + 1.3) * 0.35 + sin(u * 91.0) * 0.15;  // pleats are never all alike
  float amp = (uMode < 0.5 ? 0.13 : 0.07) * (0.9 + 0.3 * (1.0 - v)) * (0.75 + 0.55 * log(compress)) * (1.0 + jit * 0.4);
  float p1 = phase + jit, p2 = 2.1 * phase + 1.7, p3 = 4.3 * phase + u * 13.0;
  float z = amp * (sin(p1) + 0.32 * sin(p2) + 0.12 * sin(p3));
  float dz = amp * (cos(p1) + 0.32 * 2.1 * cos(p2) + 0.12 * 4.3 * cos(p3)) * uPleats * 6.28318 * (uMode < 0.5 ? 1.0 : 0.5);

  // breathing: a slow sway, stronger low down, pinned at the top
  float pin = smoothstep(1.0, 0.82, v);
  float breath = sin(uTime * 0.55 + u * 4.0 + v * 2.2) * 0.05 + sin(uTime * 0.31 + u * 9.0 - v) * 0.025;
  z += breath * pin * (0.35 + 0.65 * (1.0 - v)) * (uMode < 0.5 ? 1.0 : 0.25);
  xr += sin(uTime * 0.4 + v * 3.0 + u) * 0.03 * pin * (1.0 - v) * (uMode < 0.5 ? 1.0 : 0.0);

  float dxdu = g;
  float slope = dz / dxdu;                                         // dz / dx along the cloth
  vec3 n = normalize(vec3(-slope * uSide, 0.0, 1.0));
  if (uMode > 0.5) n = normalize(vec3(-slope, 0.0, 1.0));

  vec3 p = vec3(xr * (uMode < 0.5 ? uSide : 1.0), uY0 + v * uH, uZ + z);
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * n);
  vUv = uv;
  vFold = sin(p1);
  vX = xr;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

export const curtainFragment = /* glsl */ `
precision highp float;
${spotUniforms}
uniform vec3 uVelvet, uDeep, uSheen, uGold, uAmb, uFoot;
uniform float uFootI, uMode, uH, uTime;
varying vec3 vWorld, vNormal;
varying vec2 vUv;
varying float vFold, vX;
${noise}

vec3 lightUp(vec3 N, vec3 V, vec3 P, vec3 albedo, vec3 sheen, float spec) {
  vec3 col = vec3(0.0);
  for (int i = 0; i < ${SPOTS}; i++) {
    if (uSpotI[i] <= 0.001) continue;
    vec3 toL = uSpotPos[i] - P;
    float d2 = dot(toL, toL);
    vec3 L = toL * inversesqrt(d2);
    float c = dot(-L, uSpotDir[i]);
    float cone = smoothstep(uSpotCos[i], mix(uSpotCos[i], 1.0, 0.45), c);
    if (cone <= 0.0) continue;
    float att = min(cone * uSpotI[i] * 900.0 / (d2 + 40.0), 1.7);
    float ndl = dot(N, L);
    float wrap = max(ndl * 0.6 + 0.4, 0.0);                         // cloth scatters light round its folds
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);               // velvet: the pile catches light at grazing angles
    vec3 H = normalize(L + V);
    float s = spec > 0.0 ? pow(max(dot(N, H), 0.0), spec) * 2.2 : 0.0;
    col += uSpotCol[i] * att * (albedo * wrap + sheen * rim * (0.35 + 0.65 * max(ndl, 0.0)) * 1.6 + vec3(s));
  }
  // footlights: a warm line along the front edge of the stage, rising from below
  float foot = uFootI * exp(-max(P.y - 1.2, 0.0) * 0.42) * (0.25 + 0.75 * max(N.z * 0.6 + N.y * -0.2 + 0.4, 0.0));
  col += uFoot * foot * (albedo + sheen * pow(1.0 - max(dot(N, V), 0.0), 2.0));
  return col + albedo * uAmb;
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  if (dot(N, V) < 0.0) N = -N;
  float v = vUv.y;
  float y = v * uH;                                                 // metres above the hem

  if (uMode > 0.5) {                                                // valance: scalloped swags along its lower edge
    float sw = abs(sin(vX * 3.14159 / 3.1));
    float edge = 0.18 + 0.32 * sw;
    if (y < edge - 0.26) discard;
    y -= edge - 0.26;
  }

  // crushed velvet: a faint uneven pile, darker deep in the folds
  float pile = vnoise(vec2(vX * 9.0, y * 2.5)) * 0.18 + vnoise(vec2(vX * 31.0, y * 11.0)) * 0.08;
  float ao = mix(0.42, 1.0, smoothstep(-1.0, 0.9, vFold));
  vec3 albedo = mix(uDeep, uVelvet, 0.55 + 0.45 * ao) * (0.9 + pile);
  vec3 col;

  float fringe = 0.36, braid = 0.07;
  if (y < fringe) {                                                 // gold bullion fringe: strands with uneven tips
    float s = fract(vX * 42.0);
    float strand = smoothstep(0.5, 0.18, abs(s - 0.5));
    float id = floor(vX * 42.0);
    float tip = 0.03 + hash1(id) * 0.07;
    if (y < tip || strand < 0.25) discard;
    vec3 gold = uGold * (0.55 + 0.45 * strand) * (0.8 + 0.4 * hash1(id + 7.0));
    vec3 Nf = normalize(N + vec3((s - 0.5) * 1.6, 0.0, 0.0));
    col = lightUp(Nf, V, vWorld, gold * 0.7, gold * 0.4, 36.0);
  } else if (y < fringe + braid) {                                  // a twisted gold braid above the fringe
    float tw = 0.5 + 0.5 * sin(vX * 90.0 + y * 160.0);
    vec3 gold = uGold * (0.5 + 0.5 * tw);
    col = lightUp(N, V, vWorld, gold * 0.6, gold * 0.5, 48.0);
  } else {
    col = lightUp(N, V, vWorld, albedo, uSheen, 0.0);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

// ------------------------------------------------------------------------------------------------
// volumetric beams: open cones, additive, soft at the silhouette, fading along their length
// ------------------------------------------------------------------------------------------------
export const beamVertex = /* glsl */ `
varying float vAlong;
varying vec3 vN, vV, vWorld;
void main() {
  vAlong = -position.y;                                             // 0 at the lamp → 1 at the far end
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * mv;
}`;

export const beamFragment = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uI, uTime;
varying float vAlong;
varying vec3 vN, vV, vWorld;
${noise}
void main() {
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float core = pow(facing, 3.0);
  float along = smoothstep(0.0, 0.06, vAlong) * pow(1.0 - vAlong, 0.7) * (1.0 - smoothstep(0.8, 1.0, vAlong));
  float haze = 0.7 + 0.3 * vnoise(vWorld.xz * 0.35 + vec2(uTime * 0.07, -uTime * 0.05)) + 0.15 * vnoise(vWorld.xy * 1.3 - uTime * 0.11);
  float a = core * along * haze * uI;
  gl_FragColor = vec4(uColor * a * 0.13, 1.0);
}`;

// ------------------------------------------------------------------------------------------------
// dust: points that glitter only where a beam passes through them
// ------------------------------------------------------------------------------------------------
export const dustVertex = /* glsl */ `
${spotUniforms}
attribute float aSeed;
uniform float uTime, uSize;
varying float vA;
varying vec3 vCol;
void main() {
  vec3 p = position;
  p.x += sin(uTime * 0.11 + aSeed * 37.0) * 0.6;
  p.z += cos(uTime * 0.09 + aSeed * 51.0) * 0.6;
  p.y = 0.6 + mod(p.y + uTime * 0.05 * (0.3 + aSeed), 11.0);
  float lit = 0.0;
  vec3 col = vec3(0.0);
  for (int i = 0; i < ${SPOTS}; i++) {
    if (uSpotI[i] <= 0.001) continue;
    vec3 d = p - uSpotPos[i];
    float t = dot(d, uSpotDir[i]);
    if (t <= 0.0) continue;
    float r = length(d - uSpotDir[i] * t);
    float rad = t * sqrt(1.0 - uSpotCos[i] * uSpotCos[i]) / uSpotCos[i];
    float k = smoothstep(rad, rad * 0.35, r) * uSpotI[i];
    lit += k;
    col += uSpotCol[i] * k;
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float depth = -mv.z;
  float twinkle = 0.25 + 0.75 * pow(0.5 + 0.5 * sin(uTime * (0.6 + aSeed * 1.4) + aSeed * 90.0), 3.0);
  gl_PointSize = uSize * (0.4 + aSeed * 0.9) / max(depth, 0.5);
  vA = (0.02 + lit * 1.2) * twinkle * smoothstep(2.5, 6.0, depth) * (1.0 - smoothstep(26.0, 44.0, depth));
  vCol = lit > 0.0 ? col / max(lit, 0.001) : vec3(1.0, 0.8, 0.6);
  gl_Position = projectionMatrix * mv;
}`;

export const dustFragment = /* glsl */ `
precision highp float;
varying float vA;
varying vec3 vCol;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vCol * a * a * vA, 1.0);
}`;

// ------------------------------------------------------------------------------------------------
// press flashes: a short white-warm burst with a four-point star; each point fires at random moments
// ------------------------------------------------------------------------------------------------
export const flashVertex = /* glsl */ `
attribute float aSeed;
uniform float uTime, uSize, uOn;
varying float vI;
float h(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  float rate = 0.35 + h(aSeed * 13.0) * 0.5;
  float t = uTime * rate + aSeed * 17.0;
  float cycle = floor(t);
  float phase = fract(t);
  float fire = step(0.62, h(cycle * 1.37 + aSeed * 91.0));
  float burst = fire * (exp(-phase * 22.0) + 0.6 * exp(-max(phase - 0.09, 0.0) * 30.0) * step(0.09, phase) * step(0.5, h(cycle + aSeed)));
  vI = burst * uOn;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = vI > 0.002 ? uSize * (0.5 + vI) / max(-mv.z, 0.5) : 0.0;
  gl_Position = projectionMatrix * mv;
}`;

export const flashFragment = /* glsl */ `
precision highp float;
uniform vec3 uColor;
varying float vI;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float core = exp(-d * d * 120.0);
  float star = exp(-abs(c.x) * 60.0) * exp(-abs(c.y) * 5.0) + exp(-abs(c.y) * 60.0) * exp(-abs(c.x) * 5.0);
  float halo = exp(-d * d * 14.0) * 0.25;
  gl_FragColor = vec4(uColor * (core * 6.0 + star * 1.6 + halo) * vI, 1.0);
}`;

// ------------------------------------------------------------------------------------------------
// the LED wall: a grid of round pixels showing a slow light show (no text, no logo)
// ------------------------------------------------------------------------------------------------
export const ledVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export const ledFragment = /* glsl */ `
precision highp float;
uniform float uTime, uI;
uniform vec3 uNavy, uRed, uAmber, uIvory;
uniform vec2 uGrid;
varying vec2 vUv;
${noise}
vec3 show(vec2 uv, float t) {
  vec2 p = uv * vec2(2.35, 1.0);
  float w1 = sin(p.x * 2.6 + t * 1.3 + sin(p.y * 2.0 + t * 0.7) * 1.6);
  float ring = sin(length(p - vec2(1.17 + 0.35 * sin(t * 0.4), 0.5 + 0.12 * cos(t * 0.3))) * 9.0 - t * 2.6);
  float flow = vnoise(p * 2.2 + vec2(t * 0.25, -t * 0.12));
  vec3 c = mix(uNavy, uRed, smoothstep(-0.6, 1.0, w1) * 0.8) * 0.85;
  c = mix(c, uAmber, smoothstep(0.55, 1.0, ring * 0.5 + 0.5) * 0.75 * flow);
  float sweep = exp(-pow((uv.x - fract(t * 0.09) * 1.4 + 0.2) * 9.0, 2.0));
  c += mix(uAmber, uIvory, 0.4) * sweep * 0.35;
  float bars = smoothstep(0.985, 1.0, sin(uv.y * 34.0 - t * 3.0)) * 0.35;
  c += uAmber * bars;
  return c;
}
void main() {
  vec2 cell = fract(vUv * uGrid);
  vec2 id = floor(vUv * uGrid) / uGrid;
  float dot = smoothstep(0.5, 0.3, length(cell - 0.5));
  vec3 c = show(id, uTime * 0.6);
  float flick = 0.94 + 0.06 * hash2(id * 311.0 + floor(uTime * 24.0));
  vec3 col = c * (dot * 2.6 + 0.12) * flick * uI;
  float frame = step(0.006, vUv.x) * step(vUv.x, 0.994) * step(0.012, vUv.y) * step(vUv.y, 0.988);
  gl_FragColor = vec4(col * frame, 1.0);
}`;

// ------------------------------------------------------------------------------------------------
// floor plan of the expo: a faint grid, the aisle and the outline of every stand, drawn one by one
// ------------------------------------------------------------------------------------------------
export const planVertex = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const planFragment = (booths: number) => /* glsl */ `
precision highp float;
uniform vec4 uRect[${booths}];
uniform float uDraw, uFade, uLit[${booths}];
uniform vec3 uColor, uHot;
varying vec3 vWorld;
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float lineAt(float d, float w) { return 1.0 - smoothstep(w * 0.5, w * 1.6, abs(d)); }
void main() {
  vec2 p = vWorld.xz;
  // the drawing starts at the street door and runs toward the hall
  float reach = mix(118.0, 30.0, uDraw);
  float shown = smoothstep(reach - 2.0, reach + 2.0, p.y);
  vec2 g = abs(fract(p - 0.5) - 0.5);
  float grid = (1.0 - smoothstep(0.0, 0.03, min(g.x, g.y))) * 0.10;
  vec2 g5 = abs(fract(p / 5.0 - 0.5) - 0.5) * 5.0;
  grid += (1.0 - smoothstep(0.0, 0.04, min(g5.x, g5.y))) * 0.16;
  float aisle = lineAt(abs(p.x) - 1.55, 0.05) * 0.8;
  float stands = 0.0, hot = 0.0;
  for (int i = 0; i < ${booths}; i++) {
    vec4 r = uRect[i];
    float d = sdBox(p - r.xy, r.zw);
    float around = (atan(p.y - r.y, p.x - r.x) + 3.14159) / 6.28318;
    float k = clamp(uDraw * ${booths}.0 * 1.3 - float(i) * 1.1, 0.0, 1.0);
    float drawn = step(around, k);
    float l = lineAt(d, 0.06) * drawn;
    float inner = lineAt(d + 0.35, 0.03) * drawn * 0.5;
    stands += l + inner;
    hot += (l + (1.0 - smoothstep(-0.05, 0.0, d)) * 0.08) * uLit[i];
  }
  float a = (grid + aisle + stands) * shown * uFade;
  vec3 col = uColor * a * 0.9 + uHot * hot * 1.6 * uFade;
  gl_FragColor = vec4(col, 1.0);
}`;

// ------------------------------------------------------------------------------------------------
// sound waves from the interpreter booths: glowing oscilloscope lines on ribbons across the hall
// ------------------------------------------------------------------------------------------------
export const waveVertex = /* glsl */ `
attribute float aSeed;
varying vec2 vUv;
varying float vSeed;
void main() { vUv = uv; vSeed = aSeed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export const waveFragment = /* glsl */ `
precision highp float;
uniform float uTime, uI;
uniform vec3 uColorA, uColorB;
varying vec2 vUv;
varying float vSeed;
void main() {
  float s = vUv.x;
  // a voice: a carrier wave under a slow, breathing envelope (phrases), travelling from the booth to the stage
  float phrase = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(s * 7.0 - uTime * 1.6 + vSeed * 3.0), 2.0);
  float env = sin(3.14159 * s) * phrase;
  float y1 = 0.5 + 0.3 * env * sin(s * 30.0 - uTime * 3.4 + vSeed * 5.0);
  float y2 = 0.5 + 0.22 * env * sin(s * 30.0 - uTime * 3.4 + vSeed * 5.0 + 2.1);
  float y3 = 0.5 + 0.14 * env * sin(s * 30.0 - uTime * 3.4 + vSeed * 5.0 + 4.2);
  float a = exp(-pow((vUv.y - y1) / 0.022, 2.0)) + 0.6 * exp(-pow((vUv.y - y2) / 0.018, 2.0)) + 0.4 * exp(-pow((vUv.y - y3) / 0.016, 2.0));
  a += exp(-pow((vUv.y - 0.5) / (0.06 + 0.25 * env), 2.0)) * 0.1 * env;   // a soft glow inside the wave
  float ends = smoothstep(0.0, 0.1, s) * smoothstep(1.0, 0.8, s);
  vec3 col = mix(uColorA, uColorB, smoothstep(0.2, 0.8, s));
  gl_FragColor = vec4(col * a * ends * uI * 0.55, 1.0);
}`;

// ------------------------------------------------------------------------------------------------
// seat lamps: one small light on every seat back; lit in order as attendees register (a seat map from above)
// ------------------------------------------------------------------------------------------------
export const lampVertex = /* glsl */ `
attribute float aOrder;
uniform float uFill, uSize, uTime;
varying float vLit, vPop;
void main() {
  float since = uFill - aOrder;
  vLit = clamp(since * 90.0, 0.0, 1.0);
  vPop = vLit * exp(-max(since, 0.0) * 60.0);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uSize * (0.55 + vLit * 0.45 + vPop * 1.6) / max(-mv.z, 0.5);
  gl_Position = projectionMatrix * mv;
}`;

export const lampFragment = /* glsl */ `
precision highp float;
uniform vec3 uOn, uOff;
varying float vLit, vPop;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = exp(-d * d * 40.0) + exp(-d * d * 8.0) * 0.25;
  vec3 col = mix(uOff, uOn * (2.4 + vPop * 6.0), vLit);
  gl_FragColor = vec4(col * a, 1.0);
}`;

// ------------------------------------------------------------------------------------------------
// the pass to the shared canvas
// ------------------------------------------------------------------------------------------------
export const finishVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export const finishFragment = /* glsl */ `
precision highp float;
uniform sampler2D tScene;
uniform vec2 uRes;
uniform float uVeil, uTime, uExposure, uBloom, uDim;
uniform vec3 uNavy;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
vec3 bright(float lod, vec2 o) { return max(textureLod(tScene, vUv + o, lod).rgb - 0.55, 0.0); }

void main() {
  vec3 col = texture2D(tScene, vUv).rgb;
  // bloom from the target's own mip chain: soft halos round the lamps, the beams, the LED wall, the flashes
  vec2 px = 1.0 / uRes;
  vec3 glow = bright(2.0, vec2(0.0)) * 0.30
    + (bright(3.0, px * vec2(5.0, 0.0)) + bright(3.0, -px * vec2(5.0, 0.0)) + bright(3.0, px * vec2(0.0, 5.0)) + bright(3.0, -px * vec2(0.0, 5.0))) * 0.09
    + (bright(4.0, px * vec2(9.0, 4.0)) + bright(4.0, -px * vec2(9.0, 4.0)) + bright(4.0, px * vec2(-4.0, 9.0)) + bright(4.0, px * vec2(4.0, -9.0))) * 0.08
    + bright(5.5, vec2(0.0)) * 0.42;
  col += glow * uBloom;

  col = aces(col * uExposure * uDim);
  col = pow(col, vec3(1.0 / 2.2));

  float veil = uVeil * uVeil * (3.0 - 2.0 * uVeil);
  col = mix(col, uNavy * 0.7, veil);

  vec2 q = vUv - 0.5;
  col *= 1.0 - dot(q, q) * 0.7;                                     // vignette
  col += (hash(vUv * uRes + fract(uTime) * 61.0) - 0.5) * 0.03;     // grain
  gl_FragColor = vec4(col, 1.0);
}`;
