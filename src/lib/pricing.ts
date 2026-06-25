// Precio por noche y habitación (espejo de la maqueta). Cuando haya tarifas por
// temporada/ocupación, se sustituye por la BD tocando solo este módulo.
export const PRICE_PER_NIGHT: Record<string, number> = {
  Argia: 95, Itsaso: 105, Basoa: 95, Lasai: 90, Izar: 95,
  Haize: 95, Ibai: 95, Aritz: 100, Lorategia: 160, Lur: 95,
};

export function nights(inS: string, outS: string): number {
  return Math.round((Date.parse(outS) - Date.parse(inS)) / 86400000);
}

/** Importe a cobrar en céntimos. DEPOSIT_PCT (1-100) cobra solo señal; por
 *  defecto 100 (pago completo). */
export function amountCents(room: string, inS: string, outS: string): number {
  const n = nights(inS, outS);
  const base = (PRICE_PER_NIGHT[room] || 0) * Math.max(1, n);
  const pct = Math.min(100, Math.max(1, Number(process.env.DEPOSIT_PCT) || 100));
  return Math.round(base * pct) ; // base(€)*100(céntimos)*pct/100 = base*pct
}
