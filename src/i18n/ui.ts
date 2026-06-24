import dict from './i18n.json';

export const defaultLang = 'es' as const;

/** 10 idiomas. BE comparte contenido con NL (alias vía hreflang en Fase 7). */
export const languages = {
  es: 'Español',
  eu: 'Euskara',
  fr: 'Français',
  en: 'English',
  nl: 'Nederlands',
  de: 'Deutsch',
  da: 'Dansk',
  no: 'Norsk',
  it: 'Italiano',
} as const;

export type Lang = keyof typeof languages;

type Dict = Record<string, Partial<Record<Exclude<Lang, 'es'>, string>>>;
const I18N = dict as Dict;

/** Extrae el idioma de la URL (p.ej. /fr/... → 'fr'). ES vive en la raíz. */
export function getLangFromUrl(url: URL): Lang {
  const [, maybeLang] = url.pathname.split('/');
  if (maybeLang && maybeLang in languages) return maybeLang as Lang;
  return defaultLang;
}

/**
 * Traduce texto en español a `lang` usando el diccionario I18N portado de la
 * maqueta (clave = texto ES). Si no hay traducción (o lang = es, o pendiente
 * como EU/DA/NO en algunos storytelling), devuelve el español tal cual.
 * Soporta interpolación {var}.
 */
export function tn(lang: Lang, es: string, vars: Record<string, string | number> = {}): string {
  let out = es;
  if (lang !== defaultLang) {
    out = I18N[es]?.[lang] ?? es;
  }
  return out.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
}

/** Helper enlazado a un idioma: const t = useT(lang); t('Habitaciones'). */
export function useT(lang: Lang) {
  return (es: string, vars: Record<string, string | number> = {}) => tn(lang, es, vars);
}

/** Construye una ruta con el prefijo de idioma correcto (ES sin prefijo). */
export function localizedPath(lang: Lang, path = ''): string {
  const clean = path.replace(/^\//, '');
  if (lang === defaultLang) return '/' + clean;
  return `/${lang}/` + clean;
}
