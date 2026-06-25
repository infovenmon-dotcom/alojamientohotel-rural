import { resolve } from 'node:path';
import seed from '../data/invoices.json';

/**
 * Facturas con numeración CORRELATIVA (serie + número) en orden de emisión, como
 * exige TicketBAI. El encadenado/firmado y el envío a Batuz/LROE los hace el
 * software garante (ver src/lib/garante.ts); aquí llevamos el libro y el orden.
 *
 * Persistencia: Netlify Blobs en Netlify, fichero en local, semilla de respaldo.
 */
export interface Invoice {
  serie: string;
  numero: number; // correlativo, sin huecos
  ref: string; // p. ej. "A/1"
  fecha: string; // ISO
  room: string;
  in: string;
  out: string;
  pax?: number;
  cliente?: string;
  base: number; // base imponible (€)
  ivaPct: number; // % IVA (alojamiento turístico: 10)
  iva: number; // cuota IVA (€)
  total: number; // total (€)
  bookingId?: string;
  // Datos que devuelve el garante TicketBAI al declarar:
  tbai?: { identificador?: string; qr?: string; estado: 'pendiente' | 'declarada' | 'error'; mensaje?: string };
}
interface InvoicesFile {
  serie: string;
  next: number;
  invoices: Invoice[];
}

const ON_NETLIFY = !!process.env.NETLIFY;
const STORE = 'kirana';
const KEY = 'invoices';

function filePath(): string {
  // Solo se usa en local/Node (en Netlify se usa Blobs).
  return resolve(process.cwd(), 'src/data/invoices.json');
}
async function read(): Promise<InvoicesFile> {
  if (ON_NETLIFY) {
    const { getStore } = await import('@netlify/blobs');
    const data = (await getStore(STORE).get(KEY, { type: 'json' })) as InvoicesFile | null;
    return data ?? (seed as InvoicesFile);
  }
  try {
    const { readFileSync } = await import('node:fs');
    return JSON.parse(readFileSync(filePath(), 'utf8')) as InvoicesFile;
  } catch {
    return seed as InvoicesFile;
  }
}
async function write(data: InvoicesFile): Promise<void> {
  if (ON_NETLIFY) {
    const { getStore } = await import('@netlify/blobs');
    await getStore(STORE).setJSON(KEY, data);
    return;
  }
  const { writeFileSync } = await import('node:fs');
  writeFileSync(filePath(), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export async function listInvoices(): Promise<Invoice[]> {
  return (await read()).invoices;
}

/**
 * Crea la siguiente factura correlativa (serie/número sin huecos) y la guarda
 * en estado TicketBAI "pendiente". La declaración ante Hacienda la hará el
 * garante (garante.ts). Datos fiscales (base/IVA) calculados por el llamante.
 */
export async function createInvoice(
  data: Omit<Invoice, 'serie' | 'numero' | 'ref' | 'tbai'>
): Promise<Invoice> {
  const d = await read();
  const numero = d.next;
  const inv: Invoice = {
    ...data,
    serie: d.serie,
    numero,
    ref: `${d.serie}/${numero}`,
    tbai: { estado: 'pendiente' },
  };
  d.invoices.push(inv);
  d.next = numero + 1; // correlativo, en orden
  await write(d);
  return inv;
}

/** Actualiza el resultado de la declaración TicketBAI de una factura. */
export async function setTbaiResult(ref: string, tbai: Invoice['tbai']): Promise<void> {
  const d = await read();
  const inv = d.invoices.find((i) => i.ref === ref);
  if (inv) {
    inv.tbai = tbai;
    await write(d);
  }
}
