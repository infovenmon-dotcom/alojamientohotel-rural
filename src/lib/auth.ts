import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Auth del panel — STAND-IN por contraseña (Fase 3).
 *
 * Una sola contraseña en PANEL_PASSWORD (.env). Suficiente para proteger el
 * panel mientras no haya gestión de usuarios. En producción, sustituir por
 * auth real (usuarios + hash + sesiones) sin tocar las páginas del panel.
 */
const PASSWORD = process.env.PANEL_PASSWORD ?? 'kirana';
export const COOKIE = 'kirana_panel';

/** Valor de cookie firmado a partir de la contraseña. */
export function sessionToken(): string {
  return createHmac('sha256', PASSWORD).update('kirana-panel-v1').digest('hex');
}

export function checkPassword(input: string): boolean {
  return input === PASSWORD;
}

export function isValidSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const expected = sessionToken();
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
