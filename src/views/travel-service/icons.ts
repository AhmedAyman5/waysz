/**
 * Travel detail pages — the eight line icons of brief §2.2 (48 × 48, stroke only), copied from
 * views/immigration/Services.astro so both pages draw the same marks, plus which icon each service uses.
 */
export const TRAVEL_ICONS: Record<string, string> = {
  immigration: '<circle cx="24" cy="24" r="17"/><path d="M7 24h34M24 7c-7 5-7 29 0 34M24 7c7 5 7 29 0 34"/><path d="M24 30c-4-5-6-8-6-11a6 6 0 0 1 12 0c0 3-2 6-6 11Z"/><circle cx="24" cy="19" r="2"/>',
  study: '<path d="M4 19 24 10l20 9-20 9-20-9Z"/><path d="M12 23v9c3 3.4 7 5 12 5s9-1.600 12-5v-9"/><path d="M44 19v11"/><circle cx="44" cy="32" r="1.600"/>',
  visa: '<rect x="10" y="5" width="28" height="38" rx="3"/><circle cx="24" cy="20" r="8"/><path d="M16 20h16M24 12c-3 3-3 13 0 16M24 12c3 3 3 13 0 16"/><path d="M17 34h14M20 38h8"/>',
  translation: '<path d="M10 6h17l7 7v12"/><path d="M27 6v7h7"/><path d="M10 6v36h12"/><path d="M15 20h12M15 26h8"/><circle cx="33" cy="35" r="8"/><path d="m29 35 3 3 5.500-6"/>',
  embassy: '<path d="M6 20 24 8l18 12"/><path d="M8 20h32"/><path d="M12 24v14M20 24v14M28 24v14M36 24v14"/><path d="M6 42h36M9 38h30"/>',
  tickets: '<path d="M5 15h38v6a3.500 3.500 0 0 0 0 7v6H5v-6a3.500 3.500 0 0 0 0-7v-6Z"/><path d="M31 16v3M31 23v3M31 30v3"/><path d="M12 28l12-4.500-3.500-5.500M24 23.500l-5 6"/>',
  legalization: '<path d="M11 5h18l8 8v17"/><path d="M29 5v8h8"/><path d="M11 5v38h13"/><path d="M16 21h14M16 27h9"/><circle cx="33" cy="34" r="6"/><path d="M30 39.200V45l3-2 3 2v-5.800"/>',
  citizenship: '<rect x="5" y="10" width="38" height="28" rx="3"/><circle cx="17" cy="21" r="4"/><path d="M10 32c1.200-3.600 3.700-5 7-5s5.800 1.400 7 5"/><path d="M29 19h9M29 25h9M29 31h5"/>',
};

/** service slug → icon (the brief's order is serviceCards(lang, 'travel')) */
export const TRAVEL_ICON_OF: Record<string, string> = {
  'immigration-residency': 'immigration', 'study-abroad': 'study', 'visa-services': 'visa', 'certified-translation': 'translation',
  'embassy-consultations': 'embassy', 'flight-booking': 'tickets', 'document-legalization': 'legalization', 'egyptian-citizenship-by-investment': 'citizenship',
};
