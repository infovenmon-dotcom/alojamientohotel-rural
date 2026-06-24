// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Dominio canónico recomendado (consolidar en uno + 301). Confirmar con Fran.
const SITE = 'https://kiranabermeo.es';

// 10 idiomas. BE comparte contenido con NL (alias documentado), por eso el
// locale operativo es `nl`; la variante BE se resolverá vía hreflang en SEO.
export default defineConfig({
  site: SITE,
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'eu', 'fr', 'en', 'nl', 'de', 'da', 'no', 'it'],
    routing: {
      // ES en la raíz (/), el resto bajo su prefijo (/eu, /fr, ...).
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
