/**
 * "Explore the world" globe (Immigration page) — the night Earth of Home §1.5 plus what makes countries
 * readable: a soft land tint, border lines and a fill for the hovered / selected country.
 * Display (sRGB) space, colours from the semantic tokens. No depth buffer: everything on the surface fades
 * out by itself behind the horizon (`uHorizon` = cosine of the angle where the limb is).
 */
export const exploreFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorld;
uniform sampler2D uMap;      // NASA Black Marble (city lights)
uniform sampler2D uLand;     // land mask drawn from the border polygons
uniform vec3 uAmber;
uniform vec3 uNavy;
uniform vec3 uSky;
uniform vec3 uSunDir;
uniform float uFade;

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float ndv = max(dot(N, V), 0.0);
  vec3 tex = texture2D(uMap, vUv).rgb;
  float land = texture2D(uLand, vUv).r;
  float lights = smoothstep(0.3, 0.85, max(tex.r, tex.g));
  vec3 col = uNavy * 0.5 + tex * vec3(0.3, 0.5, 0.95) * 0.16;           // sea: cold and dark
  col = mix(col, uNavy * 1.02 + uSky * 0.055, land);                    // land: one step lighter, so coasts read
  col += (uAmber * 1.1 + vec3(1.0, 0.86, 0.62) * lights * lights * 0.16) * lights;   // cities, warm
  col *= 0.4 + 0.6 * smoothstep(0.0, 0.5, ndv);                         // limb darkening
  float dusk = smoothstep(0.45, 1.0, dot(N, uSunDir));
  col += mix(uAmber, uSky, 0.18) * dusk * (0.04 + 0.34 * pow(1.0 - ndv, 2.0));   // last light on the limb, warm
  col += uSky * pow(1.0 - ndv, 3.4) * 0.4;
  gl_FragColor = vec4(mix(uNavy, col, uFade), 1.0);
}`;

/** lines and fills lying on the sphere: `vFacing` = how much the point faces the camera */
export const surfaceVertex = /* glsl */ `
uniform vec3 uCenter;
varying float vFacing;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vFacing = dot(normalize(world.xyz - uCenter), normalize(cameraPosition - uCenter));
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

export const surfaceFragment = /* glsl */ `
precision highp float;
varying float vFacing;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uHorizon;
uniform float uFade;
void main() {
  float vis = smoothstep(uHorizon, uHorizon + 0.12, vFacing);
  if (vis <= 0.0) discard;
  float rim = 0.55 + 0.45 * smoothstep(uHorizon, 1.0, vFacing);          // a little dimmer toward the limb
  gl_FragColor = vec4(uColor * uAlpha * vis * rim * uFade, 1.0);
}`;

/** a country fill: painted over the land with real alpha */
export const fillFragment = /* glsl */ `
precision highp float;
varying float vFacing;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uHorizon;
uniform float uFade;
void main() {
  float vis = smoothstep(uHorizon, uHorizon + 0.12, vFacing);
  if (vis <= 0.0) discard;
  gl_FragColor = vec4(uColor, uAlpha * vis * uFade);
}`;
