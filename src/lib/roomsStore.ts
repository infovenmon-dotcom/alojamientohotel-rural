import { resolve } from 'node:path';
import type { Room } from './rooms';
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
const ON_NETLIFY = !!process.env.NETLIFY;
const BLOB_STORE = 'kirana';
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
  if (ON_NETLIFY) {
    const { getStore } = await import('@netlify/blobs');
    const data = (await getStore(BLOB_STORE).get(BLOB_KEY, { type: 'json' })) as RoomsFile | null;
    return data ?? (seed as RoomsFile);
  }
  // Disco (local/Node). Si no hay sistema de ficheros (Cloudflare), respaldo.
  try {
    const { readFileSync } = await import('node:fs');
    return JSON.parse(readFileSync(roomsPath(), 'utf8')) as RoomsFile;
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
    const { writeFileSync } = await import('node:fs');
    writeFileSync(roomsPath(), JSON.stringify(data, null, 2) + '\n', 'utf8');
  } catch {
    throw new Error(
      'Persistencia no disponible: este hosting es de solo lectura. ' +
        'Conecta KV o una base de datos para guardar cambios.'
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
