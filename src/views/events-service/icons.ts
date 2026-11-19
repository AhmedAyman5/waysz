/**
 * Events detail pages — the ten line icons of brief §2.3 (48 × 48, stroke only), one per service slug, copied from
 * views/events/Services.astro so the group page and the detail pages draw the same marks.
 */
export const EVENTS_ICONS: Record<string, string> = {
  'international-conferences': '<path d="M14 42h20M24 42V27"/><path d="M11 27h26l-3-8H14l-3 8Z"/><path d="M24 19V9M20 9h8"/><path d="M31 11c2.500 2 2.500 6 0 8M34 8c4.500 3.500 4.500 10.500 0 14"/>',
  'trade-exhibitions': '<path d="M5 41h38"/><path d="M8 41V19l16-9 16 9v22"/><path d="M8 19h32"/><path d="M16 41V27h16v14"/><path d="M24 27v14"/>',
  'exhibition-participation': '<circle cx="24" cy="24" r="17"/><path d="M7 24h34M24 7c-7 5-7 29 0 34M24 7c7 5 7 29 0 34"/>',
  'stand-design-build': '<path d="M24 6 40 15v18L24 42 8 33V15L24 6Z"/><path d="m8 15 16 9 16-9M24 24v18"/>',
  'delegation-guest-management': '<rect x="8" y="9" width="32" height="18" rx="2"/><path d="M14 27v13M34 27v13M15 16h18M19 21h10"/>',
  'registration-attendance': '<rect x="12" y="9" width="24" height="33" rx="3"/><path d="M20 5h8v7h-8z"/><circle cx="24" cy="21" r="4"/><path d="M18 31h12M18 36h8"/>',
  'interpretation-event-technology': '<path d="M10 29v-5a14 14 0 0 1 28 0v5"/><rect x="8" y="28" width="6" height="11" rx="2"/><rect x="34" y="28" width="6" height="11" rx="2"/><path d="M37 39c0 3-4 5-9 5"/>',
  'delegation-visas': '<path d="M12 6h22a2 2 0 0 1 2 2v32a2 2 0 0 1-2 2H12V6Z"/><circle cx="24" cy="21" r="6"/><path d="M18 21h12M24 15c-2 2-2 10 0 12M24 15c2 2 2 10 0 12M18 34h12"/>',
  'event-marketing': '<path d="M8 20v8h6l14 8V12l-14 8H8Z"/><path d="m14 28 3 10h5l-2-9"/><path d="M33 18c2.500 3 2.500 9 0 12M37 14c5 5 5 15 0 20"/>',
  'sponsor-speaker-management': '<rect x="19" y="6" width="10" height="20" rx="5"/><path d="M14 20a10 10 0 0 0 20 0M24 30v8M17 42h14"/>',
};
