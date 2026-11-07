// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: 'https://waysz.org',
  trailingSlash: 'always',          // matches build.format "directory" → /about/ → about/index.html
  build: { format: 'directory' },
  i18n: {
    defaultLocale: 'ar',
    locales: ['ar', 'en'],
    routing: { prefixDefaultLocale: false },   // Arabic at "/", English at "/en/"
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'ar', locales: { ar: 'ar', en: 'en' } },
      filter: (page) => !page.includes('/dev/'),
    }),
  ],
  devToolbar: { enabled: false },
});
