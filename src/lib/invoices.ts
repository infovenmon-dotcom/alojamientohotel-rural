import { resolve } from 'node:path';
import seed from '../data/invoices.json';
import { readJson, updateJson } from './persist';

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
  nif?: string; // NIF/CIF del cliente (factura con datos fiscales)
  direccion?: string; // dirección fiscal del cliente
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

const KEY = 'invoices';

function filePath(): string {
  // Solo se usa en local/Node (en Netlify se usa Blobs).
  return resolve(process.cwd(), 'src/data/invoices.json');
}
async function read(): Promise<InvoicesFile> {
  return readJson<InvoicesFile>(KEY, seed as InvoicesFile, filePath());
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
  let inv!: Invoice;
  // Numeración correlativa segura ante concurrencia (sin huecos ni duplicados).
  await updateJson<InvoicesFile>(KEY, seed as InvoicesFile, filePath(), (d) => {
    const numero = d.next;
    inv = {
      ...data,
      serie: d.serie,
      numero,
      ref: `${d.serie}/${numero}`,
      tbai: { estado: 'pendiente' },
    };
    d.invoices.push(inv);
    d.next = numero + 1; // correlativo, en orden
    return d;
  });
  return inv;
}

/** Actualiza el resultado de la declaración TicketBAI de una factura. */
export async function setTbaiResult(ref: string, tbai: Invoice['tbai']): Promise<void> {
  await updateJson<InvoicesFile>(KEY, seed as InvoicesFile, filePath(), (d) => {
    const inv = d.invoices.find((i) => i.ref === ref);
    if (inv) inv.tbai = tbai;
    return d;
  });
}
