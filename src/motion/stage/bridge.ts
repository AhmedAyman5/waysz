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

/**
 * Legal page — "From uncertainty to balance". Written by scenes/legal-thread.ts (the page), legal-weights.ts
 * (the six services) and legal-colonnade.ts (the walk between the columns); read by acts/justice.ts.
 * Sections, in page order: 0 hero · 1 services · 2 colonnade · 3 why · 4 how · 5 faq · 6 consult.
 */
export const justice = {
  shot: 0,                                   // section index + progress inside it (0…7): moves the camera
  count: 0,                                  // how many service weights scrolling has put on the pan (0…6)
  focus: -1,                                 // service under the pointer / keyboard focus: its weight goes on too (-1 = none)
  final: false,                              // the last small weight: the consult section has arrived → perfect balance
  walk: 0,                                   // 0…1 along the colonnade
  veil: 0,                                   // 0…1 sweep of light that hides the cut into the colonnade
  side: 1 as 1 | -1,                         // 1 = the scales stand on the right of the text (LTR) · -1 = on the left (RTL)
  compact: false,                            // small / portrait screens: the scales hold the upper part of the screen
  poster: false,                             // dev only (?scales=poster): balanced, centred, still — to re-render the poster
  icons: [] as string[],                     // one SVG path (48 × 48 box) per service: engraved on its weight
  impact: 0,                                 // counts the weights that have landed (the DOM may react)
};

/**
 * Exhibitions & Conferences page — "The show is about to begin". Written by scenes/events-thread.ts (the page)
 * and the section scenes; read by acts/gala.ts. ONE world: a theatre with its foyer, the red carpet from the street
 * door to the stage. Sections, in page order: 0 hero · 1 services · 2 expo · 3 arrivals · 4 register ·
 * 5 interpret · 6 types · 7 roof · 8 how · 9 faq · 10 consult.
 */
export const GALA_BOOTHS = 20;               // stands on the expo floor (acts/gala.ts builds them, scenes/events-expo.ts raises them)
export const gala = {
  shot: 0,                                   // section index + progress inside it (0…11): moves the camera
  open: 0,                                   // 0 = curtain closed · 1 = drawn open (hero opens it, the consult closes it)
  carpet: 0,                                 // 0…1: the red carpet unrolled from the street door to the stage
  plan: 0,                                   // 0…1: floor-plan lines drawn on the foyer floor
  booths: 0,                                 // 0…BOOTHS: how many stands have risen (fractions = rising)
  booth: -1,                                 // stand lit by the DOM (hover / focus on its legend button), -1 = none
  hover: -1,                                 // stand under the pointer, found by the act (the DOM shows its label)
  onHover: null as ((i: number) => void) | null,   // act → scene: the stand under the pointer changed
  badge: 0,                                  // 0…1: the badge on its lanyard drops into view
  scan: 0,                                   // 0…1: the line of light across the QR code
  seats: 0,                                  // 0…1: share of the hall's seats lit (attendees registered)
  grab: { down: false, x: 0, y: 0 },         // pointer on the badge pad (host NDC, -1…1)
  waves: 0,                                  // 0…1: the sound waves from the interpreter booths
  led: 0,                                    // 0…1: the LED wall show (brightness)
  turn: 0,                                   // 0…7: the turntable brings event type n to the front
  beams: 0,                                  // 0…1: the four beams of "under one roof" converge
  final: 0,                                  // 0…1: the finale — spotlights converge on the call
  flashes: 0,                                // 0…1: press camera flashes
  veil: 0,                                   // 0…1: dip into the dark at a camera cut
  side: 1 as 1 | -1,                         // 1 = the text sits on the left (LTR) · -1 = on the right (RTL)
  compact: false,                            // small / portrait screens
  poster: '' as '' | 'curtain' | 'hall',     // dev only (?gala=curtain|hall): a still for the css tier
  lang: 'ar' as 'ar' | 'en',                 // the word on the badge
  icons: [] as string[],                     // one SVG path (48 × 48 box) per event type: engraved on its medallion
};

/**
 * Services page — "The sky of services". Written by scenes/services-sky.ts (the page), services-hero.ts,
 * services-directory.ts (tabs, cards) and services-unite.ts; read by acts/sky.ts.
 * Every service is a star, every area a constellation that draws its emblem: 0 legal (scales) · 1 travel (a plane
 * on its route) · 2 events (a stage in a spotlight) · 3 software (</>). Stars are numbered in the order of
 * src/data/services.ts (0…29), like the cards' `data-star`.
 */
export const SKY_AREAS = ['legal', 'travel', 'events', 'software'] as const;
/** «جهة واحدة تنسّق كل شيء»: where each arc starts drawing in `sky.unite` (one per item, in the order of the text) */
export const UNITE = { order: [1, 2, 3, 0], at: [0.16, 0.32, 0.48, 0.64], span: 0.14, final: 0.8 } as const;
export const sky = {
  focus: -1,                                 // constellation the camera frames: -1 = the whole sky · 0…3 = an area
  box: { x: 0, y: 0, w: 1, h: 1 },           // where on screen to frame it (CSS px inside the stage host)
  push: 0,                                   // 0…1 hero scroll: the camera drifts closer
  night: 0,                                  // 0 = twilight (top of the page) · 1 = deep night
  unite: 0,                                  // 0…1: arcs join the four constellations into one sign (see UNITE)
  hot: -1,                                   // star lit by the DOM (card under the pointer / keyboard focus), -1 = none
  pointer: { x: 0, y: 0, on: false },        // pointer over open sky (host px) — the act finds the star under it
  hover: -1,                                 // star under the pointer (found by the act)
  hoverAt: { x: 0, y: 0 },                   // its position on screen (host px)
  onHover: null as ((i: number) => void) | null,   // act → scene: the star under the pointer changed
  compact: false,                            // portrait screens: the four constellations stand in a column
  poster: '' as '' | 'scatter' | 'all' | (typeof SKY_AREAS)[number],   // dev only (?sky=…): stills for the css tier
};
