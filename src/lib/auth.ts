import { createHmac, timingSafeEqual, randomBytes, scryptSync } from 'node:crypto';
import { readAuth, writeAuth } from './authStore';

/**
 * Auth del panel — contraseña propia del administrador.
 *
 * - La contraseña se guarda HASHEADA (scrypt + salt) en el almacén (Blobs/fichero),
 *   para que Fran pueda tener y cambiar su propia clave sin tocar variables de entorno.
 * - Si todavía no hay ninguna guardada, se usa PANEL_PASSWORD (.env) como respaldo,
 *   y si tampoco existe, la clave inicial 'kirana' (cambiarla cuanto antes).
 * - La cookie de sesión es un HMAC que depende del hash actual: al cambiar la
 *   contraseña, las sesiones antiguas dejan de ser válidas automáticamente.
 *
 * Sin 2FA por ahora (decisión del cliente). El siguiente paso natural sería
 * añadir un segundo factor sobre esta misma base.
 */
const ENV_PASSWORD = process.env.PANEL_PASSWORD ?? 'kirana';
export const COOKIE = 'kirana_panel';

function scrypt(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex');
}

/** Compara dos cadenas hex en tiempo constante. */
function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * "Secreto actual" del que cuelga la firma de la cookie. Si hay contraseña
 * guardada, es su hash; si no, la contraseña de entorno. Así la cookie cambia
 * cuando cambia la clave y caduca cualquier sesión previa.
 */
async function currentSecret(): Promise<string> {
  const a = await readAuth();
  if (a.hash) return a.hash;
  return 'env:' + ENV_PASSWORD;
}

/** Valor de cookie firmado a partir del secreto actual. */
export async function sessionToken(): Promise<string> {
  const secret = await currentSecret();
  return createHmac('sha256', secret).update('kirana-panel-v1').digest('hex');
}

/** Comprueba la contraseña: contra el hash guardado, o contra la de entorno. */
export async function checkPassword(input: string): Promise<boolean> {
  if (!input) return false;
  const a = await readAuth();
  if (a.salt && a.hash) {
    return safeEqualHex(scrypt(input, a.salt), a.hash);
  }
  // Respaldo: sin contraseña guardada todavía → variable de entorno / inicial.
  const x = Buffer.from(input);
  const y = Buffer.from(ENV_PASSWORD);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Guarda una contraseña nueva (hasheada). Usado por "cambiar contraseña". */
export async function setPassword(next: string): Promise<void> {
  const salt = randomBytes(16).toString('hex');
  const hash = scrypt(next, salt);
  await writeAuth({ salt, hash, updated: new Date().toISOString() });
}

/** ¿Hay ya una contraseña propia guardada (distinta del respaldo de entorno)? */
export async function hasStoredPassword(): Promise<boolean> {
  const a = await readAuth();
  return !!(a.salt && a.hash);
}

/**
 * Recuperación "olvidé la contraseña": genera un token de un solo uso, guarda
 * sólo su hash con caducidad (1 h) y devuelve el token en claro para enviarlo
 * por email. Sin email configurado, el token no llega a nadie (no hay fuga).
 */
export async function createResetToken(): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const salt = randomBytes(16).toString('hex');
  const resetHash = salt + ':' + scrypt(token, salt);
  const a = await readAuth();
  await writeAuth({ ...a, resetHash, resetExp: Date.now() + 60 * 60 * 1000 });
  return token;
}

/** Consume el token: si es válido y no ha caducado, fija la contraseña nueva. */
export async function consumeResetToken(token: string, next: string): Promise<boolean> {
  if (!token || next.length < 8) return false;
  const a = await readAuth();
  if (!a.resetHash || !a.resetExp || a.resetExp < Date.now()) return false;
  const [salt, expected] = a.resetHash.split(':');
  if (!salt || !expected || !safeEqualHex(scrypt(token, salt), expected)) return false;
  const newSalt = randomBytes(16).toString('hex');
  const hash = scrypt(next, newSalt);
  // Fija la contraseña e invalida el token (un solo uso).
  await writeAuth({ salt: newSalt, hash, updated: new Date().toISOString() });
  return true;
}

export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await sessionToken();
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
