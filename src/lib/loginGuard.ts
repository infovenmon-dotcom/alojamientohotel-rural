import { resolve } from 'node:path';
import { readJson, writeJson } from './persist';

/**
 * Anti fuerza bruta del login del panel.
 *
 * Cuenta los intentos fallidos por IP. Tras MAX_FAILS intentos seguidos se
 * bloquea esa IP durante COOLDOWN_MS. Un acierto limpia el contador. Es un
 * freno sencillo (sin dependencias) que persiste en el mismo almacén que el
 * resto (Blobs en producción, fichero en local).
 */
const KEY = 'loginguard';
const MAX_FAILS = 5;
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutos

interface Entry {
  fails: number;
  until: number; // epoch ms hasta el que está bloqueada (0 = no bloqueada)
}
type Guard = Record<string, Entry>;
const seed: Guard = {};

function fp() {
  return resolve(process.cwd(), 'src/data/loginguard.json');
}

async function read(): Promise<Guard> {
  return readJson<Guard>(KEY, seed, fp());
}
async function write(g: Guard): Promise<void> {
  return writeJson(KEY, g, fp());
}

/** Limpia entradas caducadas para que el fichero no crezca sin control. */
function prune(g: Guard, now: number): Guard {
  for (const ip of Object.keys(g)) {
    const e = g[ip];
    if (e.until && e.until < now && e.fails === 0) delete g[ip];
    else if (!e.until && e.fails === 0) delete g[ip];
  }
  return g;
}

/** ¿Está esta IP bloqueada ahora mismo? Devuelve segundos que quedan (0 si no). */
export async function lockedSeconds(ip: string, now: number): Promise<number> {
  if (!ip) return 0;
  const g = await read();
  const e = g[ip];
  if (e && e.until && e.until > now) return Math.ceil((e.until - now) / 1000);
  return 0;
}

/** Registra un intento fallido. Bloquea la IP si supera el máximo. */
export async function registerFail(ip: string, now: number): Promise<void> {
  if (!ip) return;
  const g = prune(await read(), now);
  const e = g[ip] || { fails: 0, until: 0 };
  // Si el bloqueo previo ya caducó, reiniciamos el contador.
  if (e.until && e.until < now) {
    e.fails = 0;
    e.until = 0;
  }
  e.fails += 1;
  if (e.fails >= MAX_FAILS) e.until = now + COOLDOWN_MS;
  g[ip] = e;
  await write(g);
}

/** Acierto: limpia el contador de esa IP. */
export async function registerSuccess(ip: string, now: number): Promise<void> {
  if (!ip) return;
  const g = await read();
  if (g[ip]) {
    delete g[ip];
    await write(g);
  }
}
