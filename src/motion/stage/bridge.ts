/**
 * Shared state between the DOM scenes (which own scroll) and the WebGL stage (which only draws).
 * Scenes write, the stage reads every frame. No three.js import here, so scenes stay light.
 */
export const flight = {
  live: false,                               // true while the WebGL stage is drawing the flight
  mix: 0,                                    // 0 = hero plate (video) · 1 = journey plate (image sequence)
  push: 0,                                   // hero scroll progress 0…1 (camera pushes into the clouds)
  veil: 0,                                   // 0…1 cloud white-out
  veilPage: 0,                               // 0 = warm cloud white · 1 = page background (end of the journey)
  speed: 0,                                  // 0…1 light streaks on the journey
  frame: null as ImageBitmap | null,         // current journey frame (decoded)
  frameFocus: 0.5,                           // horizontal focal point of that frame (0…1)
  frameId: -1,                               // changes whenever `frame` changes
};

/** Home §1.3 — written by scenes/areas.ts, read by acts/wipe.ts */
export const areas = {
  progress: 0,                               // 0 = intro (page colour) · 1…4 = the four photos; fractions = mid-transition
  hold: 0,                                   // 0…1 across the whole section (slow push-in)
};

/** Home §1.5 — written by scenes/globe-route.ts, read by acts/globe.ts */
export const route = {
  head: 0,                                   // 0…3: position of the plane along the three hops
  enter: 0,                                  // 0…1: the globe rising into view
  side: 1 as 1 | -1,                         // which side of the screen the globe sits on (1 = right)
  compact: false,                            // small screens: globe in the upper half
  poster: false,                             // dev only (?globe=poster): whole globe centred, to re-render the still
};

type Listener = (live: boolean) => void;
const listeners = new Set<Listener>();

/** Scenes use this to switch between their own 2D/CSS rendering and the stage. */
export function onStageLive(fn: Listener) {
  listeners.add(fn);
  fn(flight.live);
}
export function setStageLive(live: boolean) {
  if (flight.live === live) return;
  flight.live = live;
  listeners.forEach((fn) => fn(live));
}

/**
 * Immigration page — "Explore the world". Handed to scenes/explore-globe.ts by acts/explore.ts once the globe
 * is ready. The scene owns the DOM (pointer, combobox, message); the act owns the 3D (rotation, picking, flight).
 * Positions are CSS pixels inside the stage host.
 */
export interface ExploreControls {
  pick(x: number, y: number): string | null;   // country id (ISO alpha-2) under a point, or null
  hover(id: string | null): void;              // highlight a country
  drag(dx: number, dy: number): void;          // rotate by a pointer movement
  release(vx: number, vy: number): void;       // let go with a velocity (px/s) → inertia
  zoom(factor: number): void;                  // multiply the zoom (clamped)
  flyTo(id: string, onLand: () => void): void; // turn to the country, fly the plane from Egypt, then call back
  setAuto(on: boolean): void;                  // gentle rotation while idle
  setLayout(side: 1 | -1, compact: boolean): void;
}

/**
 * Software page hero — "Code in flight". Written by scenes/code-hero.ts, read by acts/glyphs.ts.
 * The scene measures where every character of the DOM code sits (CSS pixels inside the stage host); the act
 * lands one instanced glyph on each of them, so the canvas can take over from the DOM without a jump.
 */
export interface CodeGlyph { ch: string; x: number; y: number; tone: number }   // x, y: top-left of the character cell · tone: 0 ink · 1 accent · 2 string · 3 dim
export interface CodeLayout { glyphs: CodeGlyph[]; cellW: number; lineH: number; fontPx: number; family: string; weight: string }
export const code = {
  layout: null as CodeLayout | null,
  version: 0,                                // changes whenever `layout` is measured again (resize)
  settled: false,                            // the DOM entrance has finished: the canvas may take over
  leave: 0,                                  // hero scroll progress 0…1: the code lifts off and flies away
  plate: [0, 1] as [number, number],         // footage box behind the screen: top offset and height, in screen heights
};
