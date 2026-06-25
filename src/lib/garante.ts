import type { Invoice } from './invoices';

/**
 * Capa "software garante" TicketBAI. La firma XAdES, el encadenado y el envío a
 * Batuz/LROE (Bizkaia) los hace un proveedor CERTIFICADO (B2Brouter, fiskaly,
 * InnoQubit…) vía su API. Aquí dejamos la interfaz; el adaptador concreto se
 * añade cuando se elija proveedor y haya certificado + datos fiscales.
 *
 * Importante (legal): no emitir TicketBAI con software propio no registrado.
 */
export interface TbaiResult {
  identificador?: string; // código TBAI
  qr?: string; // dato/URL del QR
  estado: 'pendiente' | 'declarada' | 'error';
  mensaje?: string;
}

export interface GaranteProvider {
  declare(invoice: Invoice): Promise<TbaiResult>;
}

/** Devuelve el proveedor configurado (env GARANTE_PROVIDER) o null si no hay. */
export function getGarante(): GaranteProvider | null {
  // Pendiente: instanciar el adaptador del proveedor elegido con su API key y
  // el certificado. p. ej. 'b2brouter' | 'fiskaly'.
  // const p = process.env.GARANTE_PROVIDER;
  return null;
}

/** Declara una factura ante Hacienda vía el garante. Si no hay proveedor,
 *  la deja "pendiente" (sin romper el flujo de reserva/pago). */
export async function declareInvoice(invoice: Invoice): Promise<TbaiResult> {
  const g = getGarante();
  if (!g) return { estado: 'pendiente', mensaje: 'Garante TicketBAI no configurado todavía.' };
  try {
    return await g.declare(invoice);
  } catch (e) {
    return { estado: 'error', mensaje: e instanceof Error ? e.message : 'Error al declarar' };
  }
}
