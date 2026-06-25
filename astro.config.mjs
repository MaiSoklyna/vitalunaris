import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
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
    '/uebersicht': '/ausbildung/uebersicht',
    '/jawort-by-jansen': '/praxisangebote/jawort-by-jansen',
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
    emdash({
      database: useCloudflare
        ? d1({ binding: 'DB', session: 'auto' })
        : sqlite({ url: process.env.EMDASH_DATABASE_URL ?? 'file:./data.db' }),
      storage: useCloudflare
        ? r2({ binding: 'MEDIA' })
        : local({ directory: './uploads', baseUrl: '/_emdash/api/media/file' }),
    }),
  ],
});
