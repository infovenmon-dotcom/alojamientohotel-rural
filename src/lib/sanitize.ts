/**
 * Limpia texto de entrada del usuario antes de guardarlo o mostrarlo:
 * - quita < > (evita inyeccion de HTML/script almacenado),
 * - elimina caracteres de control,
 * - recorta espacios y limita la longitud (evita abuso/almacenamiento gigante).
 */
export function clean(v: unknown, maxLen = 200): string {
  return String(v ?? '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLen);
}
