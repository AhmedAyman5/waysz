/**
 * Services page — the four emblems as small line icons (48 × 48, stroke only): the same drawings the stars make
 * in the sky (acts/sky.ts). Used on the tabs and on every card (they draw themselves on hover).
 */
export const EMBLEM: Record<'all' | 'legal' | 'travel' | 'events' | 'software', string> = {
  // four ways from one centre
  all: '<path d="M24 4v12M24 32v12M4 24h12M32 24h12"/><path d="m24 17 2.4 4.6L31 24l-4.6 2.4L24 31l-2.4-4.6L17 24l4.6-2.4Z"/>',
  // a pair of scales
  legal: '<path d="M24 9v30M16 40h16M8 14h32"/><path d="M8 14 4 26h8L8 14ZM40 14l-4 12h8l-4-12Z"/><path d="M4 26a4 3 0 0 0 8 0M36 26a4 3 0 0 0 8 0"/>',
  // a plane on its route
  travel: '<path d="M5 43c6-1 11-5 15-11" stroke-dasharray="3 4"/><path d="M42 7 21 15l8 4 4 8 9-20Z"/><path d="m29 19-6 6"/>',
  // a stage in a spotlight
  events: '<path d="M24 5v4M24 9 13 31M24 9l11 22"/><path d="M13 31a11 3 0 0 0 22 0"/><path d="M5 36h38M8 36v7M40 36v7"/>',
  // </>
  software: '<path d="M16 14 6 24l10 10M32 14l10 10-10 10M27 9l-6 30"/>',
};
