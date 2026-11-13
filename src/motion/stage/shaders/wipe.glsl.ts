/**
 * "Wipe" full-screen shader — Home §1.3. Two photo plates and a transition between them:
 *   style 0  cloud wipe      the page-coloured cloud we climbed into parts and the first photo appears
 *   style 1  liquid          a displaced, rippling front sweeps sideways
 *   style 2  light sweep     a diagonal band of warm light carries the next photo in
 *   style 3  iris            the next photo opens from the pointer side outward
 * Display (sRGB) space: photo in → photo out. Defines: OCT (noise octaves).
 */
export { vertex } from './flight.glsl';

export const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform vec2 uFromSize;
uniform vec2 uToSize;
uniform vec2 uFocus;      // horizontal focal points (from, to) when a plate is cropped
uniform float uFromOn;    // 0 = "from" is the flat page colour (intro)
uniform float uT;         // transition 0…1
uniform float uStyle;
uniform float uHold;      // slow push-in across the section
uniform float uDir;       // 1 ltr · -1 rtl (the sweep follows the reading direction; photos never mirror)
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uTime;
uniform vec3 uPage;
uniform vec3 uAmber;
uniform vec3 uNavy;
uniform vec3 uCloudLit;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < OCT; i++) { s += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return s;
}
vec2 coverUv(vec2 uv, vec2 tex, float focus) {
  float rs = uRes.x / uRes.y, rt = tex.x / tex.y;
  vec2 s = rs > rt ? vec2(1.0, rt / rs) : vec2(rs / rt, 1.0);
  float cx = clamp(focus, s.x * 0.5, 1.0 - s.x * 0.5);
  return vec2(cx + (uv.x - 0.5) * s.x, 0.5 + (uv.y - 0.5) * s.y);
}
vec3 plate(sampler2D tex, vec2 size, float focus, vec2 uv, float zoom) {
  vec2 p = (uv - 0.5) / zoom + 0.5 - uMouse * 0.014;
  return texture2D(tex, coverUv(p, size, focus)).rgb;
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 cuv = (uv - 0.5) * vec2(aspect, 1.0);
  float n = fbm(cuv * 1.7 + vec2(uTime * 0.02, -uTime * 0.03));
  float n2 = fbm(cuv * 3.1 + vec2(7.3, uTime * 0.05));
  float x = uDir > 0.0 ? uv.x : 1.0 - uv.x;

  // where the front is: field 0…1, the next photo shows where field < the moving edge
  float field, soft;
  if (uStyle < 0.5)      { field = mix(n, 1.0 - uv.y, 0.35) * 0.8 + n2 * 0.2; soft = 0.16; }
  else if (uStyle < 1.5) { field = x * 0.72 + n * 0.28;                       soft = 0.07; }
  else if (uStyle < 2.5) { field = (x + (1.0 - uv.y) * 0.6) / 1.6 * 0.88 + n * 0.12; soft = 0.1; }
  else                   { field = length(cuv - vec2(uMouse.x * 0.25, -0.1)) / length(vec2(aspect, 1.0) * 0.62) * 0.8 + n * 0.2; soft = 0.08; }
  float edge = uT * (1.0 + 2.0 * soft) - soft;
  float a = smoothstep(edge - soft, edge + soft, field);      // 1 = still the old plate
  float band = 1.0 - abs(a * 2.0 - 1.0);                      // peaks on the front

  // both plates are pushed around near the front (liquid / heat-haze), strongest in style 1
  float amount = uStyle < 0.5 ? 0.05 : (uStyle < 1.5 ? 0.16 : 0.07);
  vec2 disp = (vec2(n, n2) - 0.5) * band * amount;
  float zoom = 1.06 + uHold * 0.05;
  vec3 from = plate(uFrom, uFromSize, uFocus.x, uv + disp * uT, zoom + uT * 0.07);
  vec3 to = plate(uTo, uToSize, uFocus.y, uv - disp * (1.0 - uT), zoom + (1.0 - uT) * 0.09);

  // film finish on the photos only (the intro is the flat page colour and must match the DOM exactly)
  vec2 sun = vec2(0.5, 0.5) + uMouse * vec2(0.42, 0.36);
  float glow = exp(-length((uv - sun) * vec2(aspect, 1.0)) * 2.6);
  float vig = mix(0.7, 1.0, smoothstep(1.25, 0.35, length((uv - 0.5) * vec2(1.15, 1.0))));
  float grain = (hash(uv * uRes + fract(uTime) * 91.7) - 0.5) * 0.05;
  from = from * vig + uAmber * glow * 0.07 + grain;
  to = to * vig + uAmber * glow * 0.07 + grain;
  from = mix(uPage, from, uFromOn);

  vec3 col = mix(to, from, a);
  // the front itself: lit cloud (style 0) or a warm light band
  float lit = band * band * sin(3.14159 * uT);
  col = uStyle < 0.5 ? mix(col, mix(uCloudLit, uPage, 0.5), band * (1.0 - uT) * 0.85)
                     : col + uAmber * lit * (uStyle < 2.5 && uStyle > 1.5 ? 0.55 : 0.28);

  gl_FragColor = vec4(col, 1.0);
}`;
