/**
 * Act "glyphs" — Software page hero. Two programs:
 *   backdrop: the dusk footage placed like the DOM plate, under the same scrim as .chero__scrim, fading to night
 *   glyphs:   instanced quads from a glyph atlas. Code glyphs rest on their slot (z = 0 is the pixel plane of
 *             the DOM text) and fly to a place in the swarm as uLeave grows; swarm glyphs turn slowly in depth
 *             and stream past the camera. The pointer pushes nearby glyphs away. All motion is in the vertex
 *             shader: nothing is animated on the CPU.
 */
export const backdropVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const backdropFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uPlate;
  uniform vec2 uRes, uPlateSize, uBox, uMouse;
  uniform float uFlip, uNight, uPush, uTime;
  uniform vec3 uNavy;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    float ty = 1.0 - vUv.y;                                   // 0 = top of the screen
    // the plate box (CSS: top = uBox.x × 100%, height = uBox.y × 100%), object-fit: cover, centred
    vec2 q = vec2(vUv.x, (ty - uBox.x) / uBox.y);
    float boxAspect = uRes.x / (uRes.y * uBox.y);
    float texAspect = uPlateSize.x / uPlateSize.y;
    vec2 part = boxAspect > texAspect ? vec2(1.0, texAspect / boxAspect) : vec2(boxAspect / texAspect, 1.0);
    float zoom = 1.0 + uPush * 0.12;
    vec2 uv = ((q - 0.5) / zoom - uMouse * vec2(0.004, -0.003)) * part + 0.5;
    uv.y = mix(1.0 - uv.y, uv.y, uFlip);
    vec3 col = texture2D(uPlate, clamp(uv, 0.0, 1.0)).rgb;

    // the scrim of .chero__scrim: bottom gradient, top gradient, flat veil
    float fromBottom = vUv.y;
    float a1 = fromBottom < 0.4 ? mix(0.96, 0.62, fromBottom / 0.4) : mix(0.62, 0.0, clamp((fromBottom - 0.4) / 0.4, 0.0, 1.0));
    float a2 = 0.62 * (1.0 - clamp(ty / 0.24, 0.0, 1.0));
    float veil = 1.0 - (1.0 - a1) * (1.0 - a2) * (1.0 - 0.26);
    col = mix(col, uNavy, veil);
    col = mix(col, uNavy, uNight);

    col += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.022 * (1.0 - uNight);   // film grain
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const glyphVertex = /* glsl */ `
  attribute vec3 aSlot;        // code: its place in the text (z = 0) · swarm: home position in the volume
  attribute vec3 aFrom;        // code: where it flies to when the code lifts off
  attribute vec2 aUv;          // bottom-left of its cell in the atlas
  attribute vec4 aMeta;        // kind (0 code · 1 swarm) · tone · two random numbers
  uniform float uTime, uLeave, uSwarm, uField, uDist, uPush, uDepth;
  uniform vec2 uMouse, uQuad, uCell;
  varying vec2 vUv;
  varying float vAlpha, vTone;

  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

  void main() {
    float r1 = aMeta.z, r2 = aMeta.w;
    vec3 p;
    float angle, alpha, scale = 1.0;

    if (aMeta.x < 0.5) {
      // a character of the code: slot → swarm, one after another
      float t = clamp(uLeave * 1.7 - r1 * 0.7, 0.0, 1.0);
      float e = t * t * (3.0 - 2.0 * t);
      p = mix(aSlot, aFrom, e);
      float arc = sin(e * 3.14159);
      p.xy += vec2((r2 - 0.5) * 300.0, 90.0 + r1 * 160.0) * arc;
      angle = e * (r2 - 0.5) * 9.0;
      alpha = mix(1.0, 0.34, e) * (1.0 - smoothstep(0.82, 1.0, uLeave));
    } else {
      // the swarm: a slow turn about the vertical axis, a stream toward the camera while scrolling
      p = aSlot;
      vec2 c = vec2(0.0, -uDepth * 0.42);
      p.xz = rot(uTime * (0.012 + r1 * 0.02)) * (p.xz - c) + c;
      p.z = mod(p.z + uPush * 1900.0 + uDepth, uDepth + 620.0) - uDepth;
      p.y += sin(uTime * 0.35 + r2 * 6.283) * 16.0;
      angle = (r2 - 0.5) * 1.4 + uTime * 0.12 * (r1 - 0.5);
      scale = 0.7 + r1 * 1.5;
      float nearFade = 1.0 - smoothstep(300.0, 600.0, p.z);
      float farFade = smoothstep(-uDepth, -uDepth * 0.72, p.z);
      alpha = uSwarm * (0.14 + 0.3 * r2) * nearFade * farFade * (1.0 - smoothstep(0.84, 1.0, uLeave));
    }

    // pointer field, in screen space: glyphs near the pointer are pushed away and turn
    float persp = uDist / (uDist - p.z);
    vec2 d = p.xy * persp - uMouse;
    float f = uField * exp(-dot(d, d) / 26000.0);
    p.xy += normalize(d + vec2(0.0001)) * f * 78.0 / persp;
    angle += f * (r2 - 0.5) * 2.2;

    vec2 corner = rot(angle) * (position.xy * uQuad * scale);
    vUv = aUv + uv * uCell;
    vAlpha = alpha;
    vTone = aMeta.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p.xy + corner, p.z, 1.0);
  }
`;

export const glyphFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uAtlas;
  uniform vec3 uTone[4];
  varying vec2 vUv;
  varying float vAlpha, vTone;
  void main() {
    float a = texture2D(uAtlas, vUv).a * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uTone[int(vTone + 0.5)], a);
  }
`;
