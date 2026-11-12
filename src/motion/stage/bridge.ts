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
  frame: null as HTMLImageElement | null,    // current journey frame
  frameId: -1,                               // changes whenever `frame` changes
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
