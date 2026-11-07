import ar from './ar.json';
import en from './en.json';

export const languages = { ar: 'العربية', en: 'English' } as const;
export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'ar';

type Dict = typeof ar;
// en.json must have exactly the same keys as ar.json (TypeScript checks this with `npm run check`).
const dictionaries: Record<Lang, Dict> = { ar, en };

/** All UI strings for a language: `const t = useTranslations(lang); t.nav.home` */
export const useTranslations = (lang: Lang): Dict => dictionaries[lang];

export const dirOf = (lang: Lang): 'rtl' | 'ltr' => (lang === 'ar' ? 'rtl' : 'ltr');
export const otherLang = (lang: Lang): Lang => (lang === 'ar' ? 'en' : 'ar');

/** '/services/' + 'en' → '/en/services/'. Always pass the Arabic path (no /en prefix). */
export function localizePath(path: string, lang: Lang): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return lang === defaultLang ? p : `/${lang}${p}`;
}

/** Current pathname → the same page in another language. */
export function switchLangPath(pathname: string, to: Lang): string {
  const base = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  return localizePath(base, to);
}
