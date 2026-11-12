/**
 * "Flight" full-screen shader: footage plate (hero video / journey frame) + procedural cloud layers
 * that the camera pushes through + sun glow / god rays + streaks + grade, vignette and film grain.
 * Works in display (sRGB) space on purpose: footage in → footage out, no colour shift.
 * Defines: OCT (noise octaves) · LAYERS (2|3) · RAYS (0 = off, else sample count).
 */
export const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform sampler2D uVideo;
uniform sampler2D uFrame;
uniform vec2 uRes;
uniform vec2 uVideoSize;
uniform vec2 uFrameSize;
uniform vec2 uMouse;      // -1…1, smoothed
uniform vec2 uSun;        // sun position in screen uv
uniform float uTime;
uniform float uMix;       // 0 hero · 1 journey
uniform float uPush;      // hero camera push 0…1
uniform float uVeil;      // cloud white-out 0…1
uniform float uVeilTex;   // 1 = textured cloud interior · 0 = flat colour (hand-over to the page)
uniform float uSpeed;     // streaks 0…1
uniform float uFocus;     // horizontal focal point of the hero plate when it is cropped
uniform float uFrameFocus;// same for the journey plate
uniform vec3 uAmber;
uniform vec3 uNavy;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform vec3 uVeilColor;

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

// object-fit: cover, with a horizontal focal point (footage is never mirrored)
vec2 coverUv(vec2 uv, vec2 tex, float focus) {
  float rs = uRes.x / uRes.y, rt = tex.x / tex.y;
  vec2 s = rs > rt ? vec2(1.0, rt / rs) : vec2(rs / rt, 1.0);
  float cx = clamp(focus, s.x * 0.5, 1.0 - s.x * 0.5);
  return vec2(cx + (uv.x - 0.5) * s.x, 0.5 + (uv.y - 0.5) * s.y);
}

vec3 plate(vec2 uv) {
  vec2 h = (uv - 0.5) / (1.06 + uPush * 0.22) + 0.5 - uMouse * 0.012;
  vec2 j = (uv - 0.5) / 1.03 + 0.5 - uMouse * 0.006;
  vec3 hero = texture2D(uVideo, coverUv(h, uVideoSize, uFocus)).rgb;
  vec2 fj = coverUv(j, uFrameSize, uFrameFocus);
  vec3 seq = texture2D(uFrame, vec2(fj.x, 1.0 - fj.y)).rgb;   // bitmap rows are top-down
  return mix(hero, seq, uMix);
}

// one cloud sheet: depth 0 (far) … 1 (near). Near sheets rush past faster while pushing.
vec4 cloudSheet(vec2 cuv, float depth, float scale, float seed, float opacity) {
  float rush = 1.0 + uPush * uPush * (1.5 + 7.0 * depth);
  vec2 p = cuv / rush * scale + vec2(uTime * (0.012 + 0.02 * depth) + seed, seed * 1.7);
  p += uMouse * depth * 0.09;
  float n = fbm(p);
  float cover = mix(0.54 - depth * 0.05, 0.18, uPush);
  float a = smoothstep(cover, cover + 0.32, n);
  float low = smoothstep(0.62, 0.0, vUv.y);                 // at rest the wisps stay low, under the wing
  a *= mix(low, 1.0, smoothstep(0.1, 0.8, uPush)) * (1.0 - uMix);
  float lit = smoothstep(0.35, 0.85, n + (1.0 - distance(vUv, uSun)) * 0.25);
  return vec4(mix(uCloudShade, uCloudLit, lit), a * opacity);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 cuv = (uv - 0.5) * vec2(aspect, 1.0);
  vec3 col = plate(uv);

  // sun: soft glow that leans toward the pointer (+ god rays on the high tier)
  vec2 sun = uSun + uMouse * 0.035;
  #if RAYS > 0
    vec2 stepv = (sun - uv) / float(RAYS) * 0.6;
    vec2 p = uv + stepv * hash(uv * uRes);                  // jittered start: no banding
    float acc = 0.0, w = 1.0;
    for (int i = 0; i < RAYS; i++) {
      p += stepv;
      acc += max(0.0, dot(plate(p), vec3(0.299, 0.587, 0.114)) - 0.58) * w;
      w *= 0.9;
    }
    col += uAmber * acc / float(RAYS) * 1.5;
  #endif
  float glow = exp(-length((uv - sun) * vec2(aspect, 1.0)) * 2.4);
  col += uAmber * glow * mix(0.24, 0.12, uMix);
  // golden hour: a warm band along the horizon, strongest on the sun side
  float band = exp(-pow((uv.y - sun.y) * 4.5, 2.0)) * (1.0 - smoothstep(0.0, 1.1, abs(uv.x - sun.x)));
  col += uAmber * band * 0.2 * (1.0 - uMix);

  // clouds
  vec4 c1 = cloudSheet(cuv, 0.25, 1.6, 3.1, 0.55);
  col = mix(col, c1.rgb, c1.a);
  #if LAYERS > 2
    vec4 c2 = cloudSheet(cuv, 0.6, 1.1, 11.7, 0.7);
    col = mix(col, c2.rgb, c2.a);
  #endif
  vec4 c3 = cloudSheet(cuv, 1.0, 0.7, 23.9, 0.9);
  col = mix(col, c3.rgb, c3.a);

  // journey: light streaks low in the frame, stronger with speed
  float streak = smoothstep(0.93, 1.0, noise(vec2(uv.x * 1.4 - uTime * 7.0, uv.y * 240.0)));
  col += uAmber * streak * smoothstep(0.45, 0.0, uv.y) * uSpeed * uMix * 0.5;

  // grade: navy toward the top (header legibility), vignette
  col = mix(col, uNavy, smoothstep(0.7, 1.0, uv.y) * 0.4);
  float vig = smoothstep(1.2, 0.35, length((uv - 0.5) * vec2(1.15, 1.0)));
  col *= mix(0.66, 1.0, vig);

  // cloud white-out with a ragged, cloud-shaped edge
  float edge = fbm(cuv * 1.6 + vec2(uTime * 0.04, 0.0));
  float veil = clamp(uVeil * 1.9 - (1.0 - uVeil) * edge * 1.5, 0.0, 1.0);
  // inside the cloud: lit and shaded billows streaming past, the sun still glowing through
  float billow = fbm(cuv * 2.1 + vec2(uTime * 0.22, uTime * 0.04)) * 0.7 + fbm(cuv * 5.3 - vec2(uTime * 0.5, 0.0)) * 0.3;
  vec3 inside = mix(mix(uCloudShade, uVeilColor, 0.7), uVeilColor, smoothstep(0.32, 0.68, billow));
  inside += uAmber * glow * 0.3;
  col = mix(col, mix(uVeilColor, inside, uVeilTex), veil);

  // film grain (fades out inside the white-out)
  col += (hash(uv * uRes + fract(uTime) * 91.7) - 0.5) * 0.05 * (1.0 - veil);

  gl_FragColor = vec4(col, 1.0);
}`;
