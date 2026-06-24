import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Room } from './rooms';
// Copia incluida en el bundle: respaldo de LECTURA cuando no hay acceso a disco
// (p. ej. serverless en Vercel). La escritura sí requiere disco/BD.
import seed from '../data/rooms.json';

/**
 * Persistencia de las habitaciones — STAND-IN de fichero.
 *
 * Hoy lee/escribe src/data/rooms.json (la fuente única, regla #1). En
 * producción, sustituir SOLO las funciones de este módulo por consultas a la
 * BD (DATABASE_URL) — las páginas y el panel no cambian. Como la web es SSR,
 * bloquear/activar aquí se refleja en la web pública en la siguiente petición
 * (regla #2). El servidor debe ejecutarse desde la raíz del proyecto.
 */
const ROOMS_PATH = resolve(process.cwd(), 'src/data/rooms.json');

interface RoomsFile {
  _meta?: Record<string, unknown>;
  rooms: Room[];
}

function read(): RoomsFile {
  try {
    return JSON.parse(readFileSync(ROOMS_PATH, 'utf8')) as RoomsFile;
  } catch {
    // Sin disco (serverless): servir la copia del bundle. La web se ve, pero
    // refleja el estado del último despliegue hasta que haya BD.
    return seed as RoomsFile;
  }
}

function write(data: RoomsFile): void {
  try {
    writeFileSync(ROOMS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  } catch {
    throw new Error(
      'Persistencia no disponible: este hosting es de solo lectura (serverless). ' +
        'Configura DATABASE_URL para guardar cambios en la BD.'
    );
  }
}

/** Todas las habitaciones (incluye bloqueadas). Lectura fresca de disco. */
export function getAllRooms(): Room[] {
  return read().rooms;
}

/** Solo las activas — lo que ve la web pública (regla #2). */
export function getActiveRooms(): Room[] {
  return read().rooms.filter((r) => r.activa);
}

export function getRoomById(id: string): Room | undefined {
  return read().rooms.find((r) => r.id === id);
}

/** Cambia el estado activa/bloqueada de una habitación y persiste. */
export function setRoomActive(id: string, activa: boolean): Room | undefined {
  const data = read();
  const room = data.rooms.find((r) => r.id === id);
  if (!room) return undefined;
  room.activa = activa;
  write(data);
  return room;
}

/** Alterna el estado y devuelve el nuevo valor. */
export function toggleRoom(id: string): boolean | undefined {
  const room = getRoomById(id);
  if (!room) return undefined;
  return setRoomActive(id, !room.activa)?.activa;
}
