import es from './es.json';
import eu from './eu.json';
import fr from './fr.json';
import en from './en.json';
import nl from './nl.json';
import de from './de.json';
import da from './da.json';
import no from './no.json';
import it from './it.json';

export const defaultLang = 'es' as const;

/** Etiqueta legible de cada idioma (para el selector). BE comparte NL. */
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

const dictionaries = { es, eu, fr, en, nl, de, da, no, it } as Record<Lang, Record<string, string>>;

/** Extrae el idioma de la URL (p.ej. /fr/... → 'fr'). ES vive en la raíz. */
export function getLangFromUrl(url: URL): Lang {
  const [, maybeLang] = url.pathname.split('/');
  if (maybeLang && maybeLang in languages) return maybeLang as Lang;
  return defaultLang;
}

/**
 * Devuelve una función t(key) para el idioma dado, con fallback a ES si la
 * clave aún no está traducida (EU/DA/NO pendientes de traducción profesional).
 */
export function useTranslations(lang: Lang) {
  return function t(key: string, vars: Record<string, string | number> = {}): string {
    const raw = dictionaries[lang]?.[key] ?? dictionaries[defaultLang][key] ?? key;
    return raw.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
  };
}

/** Construye una ruta con el prefijo de idioma correcto (ES sin prefijo). */
export function localizedPath(lang: Lang, path = ''): string {
  const clean = path.replace(/^\//, '');
  if (lang === defaultLang) return '/' + clean;
  return `/${lang}/` + clean;
}
