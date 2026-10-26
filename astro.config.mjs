import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import emdash, { local } from 'emdash/astro';
import { sqlite } from 'emdash/db';
import { d1, r2 } from '@emdash-cms/cloudflare';

// Dev runs in a real Node runtime (@astrojs/node) against a local SQLite file
// (./data.db) — better-sqlite3 needs Node, not workerd.
// Production (EMDASH_TARGET=cloudflare) builds a Worker against D1 + R2.
const useCloudflare = process.env.EMDASH_TARGET === 'cloudflare';

export default defineConfig({
  site: 'https://vitalunaris.ch',
  output: 'server',
  // Ausbildung "Übersicht" moved under /ausbildung/ for route consistency.
  redirects: {
    '/uebersicht': '/aufstellen/uebersicht',
    '/jawort-by-jansen': '/praxisangebote/jawort-by-jansen',
    // Die Seiten unter «Systemisches Aufstellen» liegen seit Oktober 2026 unter
    // /aufstellen/… statt /ausbildung/…; alte Pfade (auch die früheren Level-URLs)
    // leiten weiter, damit geteilte Links und Suchtreffer nicht ins Leere laufen.
    '/ausbildung': '/aufstellen/uebersicht',
    '/aufstellen': '/aufstellen/uebersicht',
    '/ausbildung/uebersicht': '/aufstellen/uebersicht',
    '/ausbildung/soulwork-experience': '/aufstellen/soulwork-experience',
    '/ausbildung/systemic-soulwork': '/aufstellen/systemic-soulwork',
    '/ausbildung/systemic-soulcoach': '/aufstellen/systemic-soulcoach',
    '/ausbildung/systemic-soulcircle': '/aufstellen/systemic-soulcircle',
    '/ausbildung/infoanlaesse': '/aufstellen/infoanlaesse',
    '/ausbildung/systemic-soulwork/anmeldung': '/aufstellen/systemic-soulwork/anmeldung',
    '/ausbildung/systemic-soulwork/anmeldung-wiederholerin': '/aufstellen/systemic-soulwork/anmeldung',
    // Wiederholerinnenpreis entfällt: Spezialpreise macht Theresia direkt ab.
    '/aufstellen/systemic-soulwork/anmeldung-wiederholerin': '/aufstellen/systemic-soulwork/anmeldung',
    '/ausbildung/systemic-soulcoach/anmeldung': '/aufstellen/systemic-soulcoach/anmeldung',
    '/ausbildung/systemic-soulcoach/anmeldung-treuepreis': '/aufstellen/systemic-soulcoach/anmeldung',
    // Treuepreis entfällt: Spezialpreise macht Theresia direkt ab.
    '/aufstellen/systemic-soulcoach/anmeldung-treuepreis': '/aufstellen/systemic-soulcoach/anmeldung',
    '/ausbildung/soulcoach-level-1': '/aufstellen/systemic-soulwork',
    '/ausbildung/soulcoach-level-2': '/aufstellen/systemic-soulcoach',
    '/ausbildung/begleitung-kreis': '/aufstellen/systemic-soulcircle',
  },

  adapter: useCloudflare
    ? cloudflare({ platformProxy: { enabled: true } })
    : node({ mode: 'standalone' }),
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    mdx(),
    react(),
    sitemap({
      i18n: { defaultLocale: 'de', locales: { de: 'de-CH' } },
      // Versteckte Anmeldeseiten (Link nur per Mail) nicht in die Sitemap
      filter: (page) => !page.includes('/anmeldung'),
    }),
    emdash({
      database: useCloudflare
        ? d1({ binding: 'DB', session: 'auto' })
        : sqlite({ url: process.env.EMDASH_DATABASE_URL ?? 'file:./data.db' }),
      storage: useCloudflare
        ? r2({ binding: 'MEDIA' })
        : local({ directory: './uploads', baseUrl: '/_emdash/api/media/file' }),
      plugins: [
        {
          id: 'vitalunaris-email',
          version: '1.0.0',
          entrypoint: '/src/emdash-plugin.ts',
          format: 'native',
        },
      ],
    }),
  ],
});
