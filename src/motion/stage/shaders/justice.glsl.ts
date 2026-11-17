/**
 * Shaders of the act "justice" (Legal page). Two kinds:
 *   world shaders  — sky, light shafts, dust: drawn into the act's own render target (linear light, HDR)
 *   finish shader  — puts that picture on the shared canvas: god rays from the sun, exposure, tone mapping,
 *                    the dip into night that hides the cut into the colonnade, vignette, grain (display space)
 * The render target's ALPHA is a sky mask: the sky writes 0, every solid thing writes 1, and the additive
 * layers leave it alone — the god rays only gather light from pixels where the sky is visible.
 * Quality is set with #define RAYS (0 = no rays, a soft glow instead).
 */
export const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const skyFragment = /* glsl */ `
precision highp float;
uniform vec3 uZenith, uHorizon, uGlow, uSunDir;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float s = max(dot(d, uSunDir), 0.0);
  // dusk: a low band of last light under a deep sky, warmest toward the sun
  vec3 low = uHorizon + uGlow * (0.04 + 0.34 * pow(s, 3.0));
  vec3 col = mix(low, uZenith, pow(smoothstep(-0.03, 0.2, d.y), 0.7));
  col += uGlow * (pow(s, 60.0) * 0.5 + pow(s, 900.0) * 22.0);
  col *= mix(0.3, 1.0, smoothstep(-0.14, 0.0, d.y));
  gl_FragColor = vec4(col, 0.0);                                      // alpha 0 = sky (see the header)
}`;

/** light shafts and the pools of light they leave on the floor: additive quads, soft on every edge */
export const shaftVertex = /* glsl */ `
attribute float aKind;                                                // 0 = shaft in the air · 1 = pool on the floor
attribute float aSeed;
varying vec2 vUv;
varying float vKind, vSeed, vDepth;
void main() {
  vUv = uv; vKind = aKind; vSeed = aSeed;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

export const shaftFragment = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uTime, uGain;
varying vec2 vUv;
varying float vKind, vSeed, vDepth;
void main() {
  float across = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
  float along = smoothstep(0.0, 0.08, vUv.y) * pow(1.0 - vUv.y, 1.4);
  float drift = 0.78 + 0.22 * sin(vUv.x * 9.0 + vSeed * 40.0 + uTime * 0.21) * sin(vUv.y * 5.0 - uTime * 0.13 + vSeed * 9.0);
  float a = across * along * drift * mix(0.011, 0.06, vKind);
  a *= smoothstep(0.6, 3.0, vDepth) * (1.0 - smoothstep(34.0, 60.0, vDepth));   // never a wall in front of the lens
  gl_FragColor = vec4(uColor * a * uGain, 1.0);
}`;

export const dustVertex = /* glsl */ `
attribute float aSeed;
uniform float uTime, uSize;
varying float vA;
void main() {
  vec3 p = position;
  p.x += sin(uTime * 0.11 + aSeed * 37.0) * 0.45;
  p.z += cos(uTime * 0.09 + aSeed * 51.0) * 0.45;
  p.y = mod(p.y + uTime * 0.045 * (0.4 + aSeed), 7.5);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float depth = -mv.z;
  gl_PointSize = uSize * (0.45 + aSeed) / max(depth, 0.5);
  float twinkle = 0.3 + 0.7 * pow(0.5 + 0.5 * sin(uTime * (0.5 + aSeed) + aSeed * 90.0), 2.0);
  vA = twinkle * smoothstep(0.5, 2.2, depth) * (1.0 - smoothstep(16.0, 30.0, depth)) * smoothstep(0.0, 0.5, p.y);
  gl_Position = projectionMatrix * mv;
}`;

export const dustFragment = /* glsl */ `
precision highp float;
uniform vec3 uColor;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor * a * a * vA, 1.0);
}`;

export const finishVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export const finishFragment = /* glsl */ `
precision highp float;
uniform sampler2D tScene;
uniform vec2 uSun, uRes;
uniform float uSunOn, uVeil, uDim, uTime, uExposure;
uniform vec3 uWarm, uNavy;
varying vec2 vUv;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main() {
  vec3 col = texture2D(tScene, vUv).rgb;
  vec2 toSun = uSun - vUv;
  float dist = length(toSun * vec2(uRes.x / uRes.y, 1.0));

#if RAYS > 0
  // god rays: walk from the pixel toward the sun and gather the sky that is not hidden by columns or the scales
  vec2 stride = toSun / float(RAYS) * 0.9;
  vec2 uv = vUv + stride * hash(vUv * uRes + fract(uTime));
  float weight = 1.0;
  vec3 rays = vec3(0.0);
  for (int i = 0; i < RAYS; i++) {
    uv += stride;
    vec4 s = texture2D(tScene, uv);
    rays += min(max(s.rgb - 0.45, 0.0), vec3(5.0)) * (1.0 - s.a) * weight;
    weight *= 0.955;
  }
  col += rays / float(RAYS) * uSunOn * 0.8;
#else
  col += uWarm * pow(max(1.0 - dist * 1.3, 0.0), 3.0) * uSunOn * 0.22;
#endif

  col = aces(col * uExposure * uDim);
  col = pow(col, vec3(1.0 / 2.2));

  // the cut into the colonnade happens inside a dip into the night, with a low line of last light
  float veil = uVeil * uVeil * (3.0 - 2.0 * uVeil);
  vec3 night = uNavy + uWarm * 0.16 * exp(-pow((vUv.y - 0.42) * 5.0, 2.0)) * veil;
  col = mix(col, night, veil);

  vec2 q = vUv - 0.5;
  col *= 1.0 - dot(q, q) * 0.62;                                      // vignette
  col += (hash(vUv * uRes + fract(uTime) * 61.0) - 0.5) * 0.028;      // grain
  gl_FragColor = vec4(col, 1.0);
}`;
