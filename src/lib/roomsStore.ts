import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Room } from './rooms';
// Copia incluida en el bundle: semilla y respaldo de LECTURA.
import seed from '../data/rooms.json';

/**
 * Persistencia de las habitaciones (fuente única, regla #1).
 *
 * - En local / hosting con servidor Node: lee y escribe src/data/rooms.json.
 * - En Netlify (serverless, disco de solo lectura): usa Netlify Blobs, el
 *   almacén integrado — así bloquear/activar SÍ se guarda y se refleja en la
 *   web (regla #2), sin base de datos aparte.
 * - Si aún no se ha escrito nada, se sirve la copia del bundle (rooms.json).
 *
 * En producción puede sustituirse por una BD (DATABASE_URL) cambiando solo
 * este módulo. Las funciones son asíncronas para soportar el almacén remoto.
 */
const ON_NETLIFY = !!process.env.NETLIFY;
const ROOMS_PATH = resolve(process.cwd(), 'src/data/rooms.json');
const BLOB_STORE = 'kirana';
const BLOB_KEY = 'rooms';

interface RoomsFile {
  _meta?: Record<string, unknown>;
  rooms: Room[];
}

async function read(): Promise<RoomsFile> {
  if (ON_NETLIFY) {
    const { getStore } = await import('@netlify/blobs');
    const data = (await getStore(BLOB_STORE).get(BLOB_KEY, { type: 'json' })) as RoomsFile | null;
    return data ?? (seed as RoomsFile);
  }
  try {
    return JSON.parse(readFileSync(ROOMS_PATH, 'utf8')) as RoomsFile;
  } catch {
    return seed as RoomsFile;
  }
}

async function write(data: RoomsFile): Promise<void> {
  if (ON_NETLIFY) {
    const { getStore } = await import('@netlify/blobs');
    await getStore(BLOB_STORE).setJSON(BLOB_KEY, data);
    return;
  }
  try {
    writeFileSync(ROOMS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  } catch {
    throw new Error(
      'Persistencia no disponible: este hosting es de solo lectura. ' +
        'Configura Netlify Blobs o una base de datos para guardar cambios.'
    );
  }
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

/** Cambia el estado activa/bloqueada de una habitación y persiste. */
export async function setRoomActive(id: string, activa: boolean): Promise<Room | undefined> {
  const data = await read();
  const room = data.rooms.find((r) => r.id === id);
  if (!room) return undefined;
  room.activa = activa;
  await write(data);
  return room;
}

/** Alterna el estado y devuelve el nuevo valor. */
export async function toggleRoom(id: string): Promise<boolean | undefined> {
  const room = await getRoomById(id);
  if (!room) return undefined;
  return (await setRoomActive(id, !room.activa))?.activa;
}
