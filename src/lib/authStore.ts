import { resolve } from 'node:path';
import { readJson, writeJson } from './persist';

// Contraseña del panel guardada (hash + salt) para que el admin pueda cambiarla
// sin tocar variables de entorno. Si no hay ninguna guardada, se usa
// PANEL_PASSWORD (variable de entorno) como respaldo.
// Además guarda un token de recuperación (hasheado, con caducidad) para el
// flujo "he olvidado la contraseña" por email.
export interface AuthData {
  salt?: string;
  hash?: string;
  updated?: string;
  resetHash?: string; // hash del token de recuperación (nunca el token en claro)
  resetExp?: number; // epoch ms de caducidad del token
}
const KEY = 'auth';
const seed: AuthData = {};
function fp() {
  return resolve(process.cwd(), 'src/data/auth.json');
}
export async function readAuth(): Promise<AuthData> {
  return readJson<AuthData>(KEY, seed, fp());
}
export async function writeAuth(d: AuthData): Promise<void> {
  return writeJson(KEY, d, fp());
}
