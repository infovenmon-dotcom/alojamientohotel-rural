// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// Dominio canónico recomendado (consolidar en uno + 301). Confirmar con Fran.
const SITE = 'https://kiranabermeo.es';

// SSR (output server): la web pública y el panel leen rooms.json en cada
// petición, de modo que bloquear/activar una habitación en el panel se refleja
// en la web en vivo (regla #2). En producción, sustituir la persistencia de
// fichero por la BD (DATABASE_URL) sin tocar las páginas — ver src/lib/roomsStore.ts.
//
// 10 idiomas. BE comparte contenido con NL (alias vía hreflang en Fase 7).
export default defineConfig({
  site: SITE,
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'eu', 'fr', 'en', 'nl', 'de', 'da', 'no', 'it'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
