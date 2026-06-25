// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import netlify from '@astrojs/netlify';
import cloudflare from '@astrojs/cloudflare';

// Dominio canónico recomendado (consolidar en uno + 301). Confirmar con Fran.
const SITE = 'https://kiranabermeo.es';

// Adaptador según destino. El despliegue es Cloudflare Workers, así que es el
// POR DEFECTO (el `npm run build` del builder de Cloudflare genera el worker en
// dist/_worker.js/). Vercel/Netlify se autodetectan por su variable de entorno.
// Node es para pruebas locales: `npm run build:node`.
const target = process.env.npm_lifecycle_event === 'build:node'
  ? 'node'
  : process.env.VERCEL
    ? 'vercel'
    : process.env.NETLIFY
      ? 'netlify'
      : 'cloudflare';

const adapter =
  target === 'node'
    ? node({ mode: 'standalone' })
    : target === 'vercel'
      ? vercel()
      : target === 'netlify'
        ? netlify()
        : cloudflare({ imageService: 'compile' });

// SSR (output server): la web pública y el panel leen rooms.json en cada
// petición, de modo que bloquear/activar una habitación en el panel se refleja
// en la web en vivo (regla #2). En producción, sustituir la persistencia de
// fichero por la BD (DATABASE_URL) sin tocar las páginas — ver src/lib/roomsStore.ts.
//
// 10 idiomas. BE comparte contenido con NL (alias vía hreflang en Fase 7).
export default defineConfig({
  site: SITE,
  output: 'server',
  adapter,
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
