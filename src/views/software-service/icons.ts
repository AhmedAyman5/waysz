/**
 * Software detail pages — the six line icons of brief §2.4 (48 × 48, stroke only), copied from
 * views/software/Services.astro so both pages draw the same marks, plus which icon each service uses.
 */
export const SOFTWARE_ICONS: Record<string, string> = {
  site: '<rect x="5" y="8" width="38" height="30" rx="3"/><path d="M5 16h38"/><path d="M10 12h.01M14 12h.01"/><path d="M11 23h12M11 29h8"/><rect x="28" y="22" width="10" height="10" rx="1.5"/><path d="M18 42h12"/>',
  table: '<rect x="6" y="7" width="36" height="34" rx="3"/><path d="M6 17h36M6 25h36M6 33h36M18 17v24"/><path d="M11 12h8"/>',
  form: '<path d="M8 6h13l6 6v14"/><path d="M21 6v6h6"/><path d="M8 6v30h9"/><path d="M12 18h9M12 24h6"/><rect x="24" y="26" width="18" height="16" rx="2.5"/><path d="M28 32h10M28 37h6"/><path d="m19 30 3 3-3 3"/>',
  choose: '<circle cx="24" cy="24" r="17"/><path d="m30.500 17.500-3.500 9.500-9.500 3.500 3.500-9.500 9.500-3.500Z"/><circle cx="24" cy="24" r="1.200"/><path d="M24 7v3M24 38v3M7 24h3M38 24h3"/>',
  event: '<rect x="6" y="10" width="36" height="31" rx="3"/><path d="M6 19h36M15 6v8M33 6v8"/><path d="M12 26h10M12 32h7"/><circle cx="33" cy="30" r="5"/><path d="m30.800 30 1.600 1.600 3-3.200"/>',
  fix: '<path d="M24 5 8 11v11c0 10 6.500 17 16 21 9.500-4 16-11 16-21V11L24 5Z"/><path d="M13 25h6l3-7 4 13 3-6h6"/>',
};

/** service slug → icon (the brief's order is serviceCards(lang, 'software')) */
export const SOFTWARE_ICON_OF: Record<string, string> = {
  'website-design-development': 'site', 'custom-systems': 'table', 'digital-transformation': 'form',
  'technology-consulting': 'choose', 'event-platforms': 'event', 'support-maintenance': 'fix',
};
