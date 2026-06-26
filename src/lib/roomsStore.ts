import { resolve } from 'node:path';
import type { Room } from './rooms';
import { readJson, writeJson, updateJson } from './persist';
// Copia incluida en el bundle: semilla y respaldo de LECTURA (funciona en
// cualquier runtime, incl. Cloudflare Workers, sin tocar disco).
import seed from '../data/rooms.json';

/**
 * Persistencia de las habitaciones (fuente única, regla #1).
 *
 * - Local / hosting con servidor Node: lee y escribe src/data/rooms.json.
 * - Netlify: usa Netlify Blobs (almacén integrado) → bloquear/activar se guarda.
 * - Cloudflare Pages / serverless de solo lectura: sirve la copia del bundle;
 *   para guardar cambios se conecta KV o una BD (DATABASE_URL) tocando solo
 *   este módulo. Mientras tanto, la web muestra la semilla y el panel avisa.
 *
 * Las funciones son asíncronas para soportar almacenes remotos.
 */
const BLOB_KEY = 'rooms';

interface RoomsFile {
  _meta?: Record<string, unknown>;
  rooms: Room[];
}

// Ruta del fichero local (perezosa: process.cwd() no existe en Cloudflare).
function roomsPath(): string {
  return resolve(process.cwd(), 'src/data/rooms.json');
}

async function read(): Promise<RoomsFile> {
  return readJson<RoomsFile>(BLOB_KEY, seed as RoomsFile, roomsPath());
}

async function write(data: RoomsFile): Promise<void> {
  return writeJson(BLOB_KEY, data, roomsPath());
}

/** Todas las habitaciones (incluye bloqueadas). */
export async function getAllRooms(): Promise<Room[]> {
  return (await read()).rooms;
}

/** Solo las activas — lo que ve la web pública (regla #2). */
export async function getActiveRooms(): Promise<Room[]> {
  return (await read()).rooms.filter((r) => r.activa);
}

export async function getRoomById(id: string): Promise<Room | undefined> {
  return (await read()).rooms.find((r) => r.id === id);
}

/** Cambia el estado activa/bloqueada de una habitación y persiste (seguro ante
 *  cambios concurrentes: no se pierden activaciones seguidas). */
export async function setRoomActive(id: string, activa: boolean): Promise<Room | undefined> {
  let found: Room | undefined;
  await updateJson<RoomsFile>(BLOB_KEY, seed as RoomsFile, roomsPath(), (data) => {
    const room = data.rooms.find((r) => r.id === id);
    if (room) {
      room.activa = activa;
      found = room;
    }
    return data;
  });
  return found;
}

/** Alterna el estado y devuelve el nuevo valor. */
export async function toggleRoom(id: string): Promise<boolean | undefined> {
  const room = await getRoomById(id);
  if (!room) return undefined;
  return (await setRoomActive(id, !room.activa))?.activa;
}

/**
 * Fija el estado activa/bloqueada de VARIAS habitaciones de una sola vez.
 * El panel envía el estado COMPLETO en cada cambio: una única escritura, sin
 * carreras ni "resurrección" de cambios previos. `states` = { id: boolean }.
 */
export async function setRoomsActive(states: Record<string, boolean>): Promise<Room[]> {
  const data = await updateJson<RoomsFile>(BLOB_KEY, seed as RoomsFile, roomsPath(), (d) => {
    for (const r of d.rooms) {
      if (Object.prototype.hasOwnProperty.call(states, r.id)) r.activa = !!states[r.id];
    }
    return d;
  });
  return data.rooms;
}
