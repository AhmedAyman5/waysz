/**
 * One line icon per legal department (48 × 48, stroke only, no fill) — used by the legal detail pages
 * (departments grid) and the Legal group page's «More from our law firm» section.
 * The first six are copies of the `engrave` paths of views/legal/Services.astro (the weights of the group page);
 * keep them in sync by hand if those change. The last four are new, in the same style.
 */
export const LEGAL_ICONS: Record<string, string> = {
  'criminal-law': 'M24 5 8 11v11c0 10 6.5 17 16 21 9.5-4 16-11 16-21V11L24 5ZM17 24l5 5 9-10',
  'civil-law': 'M12 6h17l8 8v28H12V6ZM29 6v8h8M17 22h14M17 28h14M17 34h9',
  'family-law': 'M7 23 24 9l17 14M11 21v19h26V21M24 36c-5-3.6-7.5-6.4-7.5-9.4a4 4 0 0 1 7.5-2 4 4 0 0 1 7.5 2c0 3-2.5 5.8-7.5 9.4Z',
  'corporate-law': 'M6 20 24 8l18 12M8 20h32M12 24v14M20 24v14M28 24v14M36 24v14M6 42h36M9 38h30',
  'immigration-nationality-law': 'M24 7a17 17 0 1 0 0 34 17 17 0 0 0 0-34ZM7 24h34M24 7c-7 5-7 29 0 34M24 7c7 5 7 29 0 34',
  'dispute-resolution-arbitration': 'M8 12c10 0 12 12 16 12M8 36c10 0 12-12 16-12M24 24h16M35 19l5 5-5 5',
  // a domed public building: the State Council
  'administrative-law': 'M8 42h32M11 38h26M14 38V25M21 38V25M27 38V25M34 38V25M10 25h28M15 25c0-6 4-10 9-10s9 4 9 10M24 15v-5',
  // a padlock between two code brackets
  'cybercrime-digital-evidence': 'M16 22h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V24a2 2 0 0 1 2-2ZM18.5 22v-5a5.5 5.5 0 0 1 11 0v5M24 29v4M9 11l-5 5 5 5M39 11l5 5-5 5',
  // a calculator / ledger
  'legal-accounting-tax': 'M15 6h18a2 2 0 0 1 2 2v32a2 2 0 0 1-2 2H15a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2ZM18 11h12v7H18ZM18.5 25h1M24 25h1M29.5 25h1M18.5 31h1M24 31h1M29.5 31h1M18.5 37h1M24 37h1M29.5 37h1',
  // a crenellated wall with a gate (architecture, never insignia)
  'military-law': 'M6 42h36M10 42V18h5v4h5v-4h8v4h5v-4h5v24M20 42v-7a4 4 0 0 1 8 0v7M15 28h3M30 28h3',
};

/** The ten departments of the law firm, in the order the client lists them (detail pages, departments grid). */
export const LEGAL_DEPARTMENTS = [
  'criminal-law', 'civil-law', 'family-law', 'administrative-law', 'corporate-law',
  'dispute-resolution-arbitration', 'cybercrime-digital-evidence', 'legal-accounting-tax', 'military-law',
  'immigration-nationality-law',
] as const;

/** The four departments added beside the six services of the group page (views/legal/More.astro). */
export const MORE_DEPARTMENTS = ['administrative-law', 'cybercrime-digital-evidence', 'legal-accounting-tax', 'military-law'] as const;
