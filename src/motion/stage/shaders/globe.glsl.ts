/**
 * Night-Earth shaders — Home §1.5. Display (sRGB) space, colours from the semantic tokens.
 * The stage has no depth buffer: the globe is convex (front faces only) and everything that floats above
 * it (arcs) fades out by itself on the far side.
 */
export const globeVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

export const globeFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorld;
uniform sampler2D uMap;      // NASA Black Marble (city lights)
uniform vec3 uAmber;
uniform vec3 uNavy;
uniform vec3 uSky;
uniform vec3 uSunDir;        // where the last light of dusk comes from (world space)
uniform float uFade;

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float ndv = max(dot(N, V), 0.0);
  vec3 tex = texture2D(uMap, vUv).rgb;
  float lum = dot(tex, vec3(0.299, 0.587, 0.114));
  // the map's cities are near-white on a blue base: split them apart so the night stays dark
  float lights = smoothstep(0.3, 0.85, max(tex.r, tex.g));
  vec3 col = uNavy * 0.55 + tex * vec3(0.3, 0.5, 0.95) * 0.2;          // land and sea, cold and dark
  col += (uAmber * 1.05 + vec3(1.0, 0.9, 0.72) * lights * lights * 0.3) * lights;   // cities, warm
  col *= 0.35 + 0.65 * smoothstep(0.0, 0.5, ndv);                       // limb darkening
  float dusk = smoothstep(0.45, 1.0, dot(N, uSunDir));
  col += mix(uAmber, uSky, 0.35) * dusk * (0.05 + 0.3 * pow(1.0 - ndv, 2.0));      // the terminator glows warm
  col += uSky * pow(1.0 - ndv, 3.4) * 0.4;                             // thin blue atmosphere on the limb
  gl_FragColor = vec4(mix(uNavy, col, uFade), 1.0);
}`;

export const haloFragment = /* glsl */ `
precision highp float;
varying vec3 vNormalW;
varying vec3 vWorld;
uniform vec3 uSky;
uniform vec3 uAmber;
uniform vec3 uSunDir;
uniform float uFade;
void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float d = clamp(-dot(N, V) / 0.46, 0.0, 1.0);           // 0 at the outer edge → 1 at the globe's limb
  float dusk = smoothstep(-0.2, 0.9, dot(N, uSunDir));
  vec3 col = mix(uSky, uAmber, dusk * 0.5) * pow(d, 3.6) * (0.26 + dusk * 0.26);
  gl_FragColor = vec4(col * uFade, 1.0);
}`;

export const arcVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

export const arcFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vWorld;
uniform vec3 uColor;
uniform vec3 uCenter;        // globe centre (world)
uniform float uHead;         // how far this arc is drawn, 0…1
uniform float uAge;          // distance (in arcs) from the plane to the END of this arc: older = dimmer
uniform float uAlpha;
uniform float uPulse;        // ambient arcs: a light travels along them
uniform float uTime;
uniform float uFade;
void main() {
  float s = vUv.x;
  if (s > uHead) discard;
  float facing = dot(normalize(vWorld - uCenter), normalize(cameraPosition - uCenter));
  float vis = smoothstep(-0.05, 0.2, facing);
  float trail = 0.28 + 0.72 * exp(-(uAge + (1.0 - s)) * 2.2) + exp(-(uHead - s) * 14.0) * step(uHead, 0.999);
  float run = fract(uTime * 0.11 + uPulse * 7.31);
  float pulse = step(0.001, uPulse) * pow(max(0.0, 1.0 - abs(run * 1.5 - 0.25 - s) * 7.0), 2.0);
  gl_FragColor = vec4(uColor * (trail * uAlpha + pulse * 0.9) * vis * uFade, 1.0);
}`;
