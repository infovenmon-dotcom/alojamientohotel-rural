import { resolve } from 'node:path';
import seed from '../data/bookings.json';
import { readJson, writeJson, updateJson } from './persist';

/**
 * Disponibilidad por habitación = reservas propias (web/manual/canales) +
 * bloqueos externos importados del iCal de Booking. Fuente única (regla #1).
 *
 * Persistencia igual que roomsStore: Netlify Blobs en Netlify, fichero en local,
 * semilla del bundle como respaldo. Sustituible por una BD tocando solo esto.
 */
export interface Booking {
  id: string;
  room: string; // nombre (Argia, Itsaso…)
  in: string; // YYYY-MM-DD (entrada)
  out: string; // YYYY-MM-DD (salida, exclusiva)
  name?: string;
  pax?: number;
  source?: 'web' | 'manual' | 'channel' | 'stripe';
  ref?: string;
  created?: string;
}
interface BookingsFile {
  bookings: Booking[];
  external: Record<string, [string, string][]>; // por habitación, rangos [in,out)
  icalUrls: Record<string, string>; // URL .ics de Booking por habitación (import)
}

const KEY = 'bookings';

function filePath(): string {
  // Solo se usa en local/Node (en Netlify se usa Blobs).
  return resolve(process.cwd(), 'src/data/bookings.json');
}

async function read(): Promise<BookingsFile> {
  return readJson<BookingsFile>(KEY, seed as BookingsFile, filePath());
}

async function write(data: BookingsFile): Promise<void> {
  return writeJson(KEY, data, filePath());
}

/** Rangos ocupados [in,out) de una habitación: reservas propias + externos. */
export async function getUnavailable(room: string): Promise<[string, string][]> {
  const d = await read();
  const own = d.bookings.filter((b) => b.room === room).map((b) => [b.in, b.out] as [string, string]);
  const ext = d.external[room] || [];
  return own.concat(ext);
}

/** Mapa habitación -> rangos ocupados, para inyectar/servir disponibilidad. */
export async function getBookedMap(): Promise<Record<string, [string, string][]>> {
  const d = await read();
  const map: Record<string, [string, string][]> = {};
  for (const b of d.bookings) (map[b.room] ??= []).push([b.in, b.out]);
  for (const room of Object.keys(d.external)) (map[room] ??= []).push(...d.external[room]);
  return map;
}

export async function listBookings(): Promise<Booking[]> {
  return (await read()).bookings;
}

/** ¿La habitación está libre todo el rango [in,out)? */
export async function isFree(room: string, inS: string, outS: string): Promise<boolean> {
  const ranges = await getUnavailable(room);
  return !ranges.some(([a, b]) => inS < b && a < outS); // solape de intervalos
}

/** Añade una reserva (rechaza si solapa). Devuelve la reserva creada. */
export async function addBooking(b: Omit<Booking, 'id' | 'created'>, created: string): Promise<Booking> {
  const booking: Booking = { ...b, id: 'bk_' + created.replace(/\D/g, '').slice(0, 14), created };
  await updateJson<BookingsFile>(KEY, seed as BookingsFile, filePath(), (d) => {
    const clash = d.bookings.some((x) => x.room === b.room && b.in < x.out && x.in < b.out);
    const extClash = (d.external[b.room] || []).some(([a, c]) => b.in < c && a < b.out);
    if (clash || extClash) throw new Error('Esas fechas ya no están disponibles para ' + b.room);
    d.bookings.push(booking);
    return d;
  });
  return booking;
}

/** Reemplaza los bloqueos externos (Booking) de una habitación. */
export async function setExternal(room: string, ranges: [string, string][]): Promise<void> {
  const d = await read();
  d.external[room] = ranges;
  await write(d);
}

/** URLs .ics de Booking por habitación (para importar). */
export async function getIcalUrls(): Promise<Record<string, string>> {
  return (await read()).icalUrls || {};
}
export async function setIcalUrls(map: Record<string, string>): Promise<void> {
  const d = await read();
  d.icalUrls = map;
  await write(d);
}
