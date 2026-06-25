import type { Booking } from './bookings';

// iCal con eventos de día completo: DTSTART = entrada, DTEND = salida (exclusiva),
// igual semántica que usa Booking.com para "Sincronizar calendarios".

function dt(s: string): string {
  return s.replace(/-/g, ''); // 2026-07-01 -> 20260701
}

/** Exporta las reservas de una habitación como texto iCal (para que Booking lo importe). */
export function toICS(room: string, bookings: Booking[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kirana//Reservas//ES',
    'CALSCALE:GREGORIAN',
  ];
  for (const b of bookings.filter((x) => x.room === room)) {
    lines.push(
      'BEGIN:VEVENT',
      'UID:' + b.id + '@kiranabermeo.es',
      'DTSTART;VALUE=DATE:' + dt(b.in),
      'DTEND;VALUE=DATE:' + dt(b.out),
      'SUMMARY:' + (b.source === 'web' || b.source === 'stripe' ? 'Reservado (web)' : 'Reservado'),
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/** Parsea un iCal (de Booking) y devuelve los rangos ocupados [in,out). */
export function parseICS(text: string): [string, string][] {
  const ranges: [string, string][] = [];
  const blocks = text.split('BEGIN:VEVENT').slice(1);
  for (const blk of blocks) {
    const s = /DTSTART[^:]*:(\d{8})/.exec(blk);
    const e = /DTEND[^:]*:(\d{8})/.exec(blk);
    if (s && e) ranges.push([fmt(s[1]), fmt(e[1])]);
  }
  return ranges;
}
function fmt(d: string): string {
  return d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8);
}
