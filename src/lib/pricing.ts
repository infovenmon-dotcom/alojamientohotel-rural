// Precio por noche y habitación (espejo de la maqueta). Cuando haya tarifas por
// temporada/ocupación, se sustituye por la BD tocando solo este módulo.
export const PRICE_PER_NIGHT: Record<string, number> = {
  Argia: 95, Itsaso: 105, Basoa: 95, Lasai: 90, Izar: 95,
  Haize: 95, Ibai: 95, Aritz: 100, Lorategia: 160, Lur: 95,
};

export function nights(inS: string, outS: string): number {
  return Math.round((Date.parse(outS) - Date.parse(inS)) / 86400000);
}

/** Descuento de reserva directa: la web es un % más barata que las OTAs. */
export const WEB_DISCOUNT_PCT = Number(process.env.WEB_DISCOUNT_PCT) || 10;
/** Precio web (con descuento directo) a partir de la tarifa de plataformas. */
export function webPrice(tarifa: number): number {
  return Math.round((tarifa || 0) * (1 - WEB_DISCOUNT_PCT / 100));
}
/** Céntimos a cobrar dado el precio/noche (web). DEPOSIT_PCT cobra señal. */
export function amountCentsFor(nightPrice: number, inS: string, outS: string): number {
  const total = nightPrice * Math.max(1, nights(inS, outS));
  const pct = Math.min(100, Math.max(1, Number(process.env.DEPOSIT_PCT) || 100));
  return Math.round((total * 100 * pct) / 100);
}
/** Desglose de factura dado el precio/noche (web, IVA 10% incluido). */
export function invoiceAmountsFor(nightPrice: number, inS: string, outS: string) {
  const total = nightPrice * Math.max(1, nights(inS, outS));
  const ivaPct = 10;
  const base = Math.round((total / (1 + ivaPct / 100)) * 100) / 100;
  const iva = Math.round((total - base) * 100) / 100;
  return { total, base, iva, ivaPct };
}

/** Importe a cobrar en céntimos. DEPOSIT_PCT (1-100) cobra solo señal; por
 *  defecto 100 (pago completo). */
export function amountCents(room: string, inS: string, outS: string): number {
  const n = nights(inS, outS);
  const base = (PRICE_PER_NIGHT[room] || 0) * Math.max(1, n);
  const pct = Math.min(100, Math.max(1, Number(process.env.DEPOSIT_PCT) || 100));
  return Math.round(base * pct) ; // base(€)*100(céntimos)*pct/100 = base*pct
}

/** Desglose para la factura. El precio mostrado es IVA incluido (alojamiento
 *  turístico: 10%); de ahí sacamos base imponible y cuota. */
export function invoiceAmounts(room: string, inS: string, outS: string) {
  const total = (PRICE_PER_NIGHT[room] || 0) * Math.max(1, nights(inS, outS));
  const ivaPct = 10;
  const base = Math.round((total / (1 + ivaPct / 100)) * 100) / 100;
  const iva = Math.round((total - base) * 100) / 100;
  return { total, base, iva, ivaPct };
}
