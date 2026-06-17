import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://vitalunaris.ch',
  integrations: [
    tailwind(),
    mdx(),
    sitemap({
      i18n: { defaultLocale: 'de', locales: { de: 'de-CH' } },
    }),
  ],
});
