import type { APIRoute } from 'astro';
import { addBooking } from '@/lib/bookings';
import { getAllRooms } from '@/lib/rooms';
import { clean } from '@/lib/sanitize';

export const prerender = false;

// Importa reservas desde un CSV (export de Lodgify u otro). Body JSON: { csv }.
// Mapea cabeceras por nombre (es/en, con o sin acentos), tolera ; o , como
// separador y fechas ISO o DD/MM/AAAA. Las solapadas o incompletas se omiten.
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'datos inválidos' }, 400);
  }
  const csv = (body?.csv || '').toString();
  if (!csv.trim()) return json({ error: 'CSV vacío' }, 400);

  const firstLine = csv.split(/\r?\n/)[0] || '';
  const delim = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';
  const rows = parseCSV(csv, delim);
  if (rows.length < 2) return json({ error: 'el CSV no tiene filas de datos' }, 400);

  const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const header = rows[0].map(norm);
  const find = (names: string[]) => header.findIndex((h) => names.some((n) => h === n || h.includes(n)));
  const idx = {
    room: find(['habitacion', 'habitación', 'room', 'property', 'alojamiento', 'apartamento']),
    name: find(['nombre', 'name', 'guest', 'huesped', 'cliente']),
    email: find(['email', 'correo', 'e-mail']),
    phone: find(['telefono', 'phone', 'tel', 'movil']),
    in: find(['entrada', 'checkin', 'check-in', 'arrival', 'llegada', 'from', 'desde', 'inicio']),
    out: find(['salida', 'checkout', 'check-out', 'departure', 'to', 'hasta', 'fin']),
    pax: find(['pax', 'adultos', 'guests', 'personas', 'huespedes']),
    lang: find(['idioma', 'lang', 'language']),
    ref: find(['canal', 'source', 'channel', 'origen', 'ref']),
  };
  if (idx.in < 0 || idx.out < 0) {
    return json({ error: 'no encuentro las columnas de fechas (entrada/salida). Revisa las cabeceras.' }, 400);
  }

  const roomsData = await getAllRooms();
  const roomNames = roomsData.map((r) => r.nombre);
  const aptRoom = roomsData.find((r) => r.tipo === 'apartamento');
  const accRoom = roomsData.find((r) => r.tipo === 'accesible');
  const mapRoom = (raw: string) => {
    const r = (raw || '').trim();
    if (!r) return 'Sin asignar';
    const lc = r.toLowerCase();
    const exact = roomNames.find((n) => n.toLowerCase() === lc);
    if (exact) return exact;
    // Coincidencia por palabra completa (evita falsos positivos como "ibai" dentro de "Urdaibai").
    const words = lc.split(/[^a-záéíóúñ0-9]+/i);
    const word = roomNames.find((n) => words.includes(n.toLowerCase()));
    if (word) return word;
    if (/apartament/.test(lc) && aptRoom) return aptRoom.nombre;
    if (/accesibl|adaptad/.test(lc) && accRoom) return accRoom.nombre;
    return r; // se queda como viene; el admin puede ajustarlo
  };

  const now = new Date().toISOString();
  let imported = 0,
    skipped = 0;
  const cell = (row: string[], i: number) => (i >= 0 && i < row.length ? row[i].trim() : '');

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row.length || row.every((c) => !c.trim())) continue;
    const inS = toISO(cell(row, idx.in));
    const outS = toISO(cell(row, idx.out));
    if (!inS || !outS || !(inS < outS)) {
      skipped++;
      continue;
    }
    try {
      await addBooking(
        {
          room: mapRoom(cell(row, idx.room)),
          in: inS,
          out: outS,
          name: clean(cell(row, idx.name), 120) || 'Importada',
          email: clean(cell(row, idx.email), 160).toLowerCase() || undefined,
          phone: clean(cell(row, idx.phone), 40) || undefined,
          pax: cell(row, idx.pax) ? Number(cell(row, idx.pax)) || undefined : undefined,
          lang: cell(row, idx.lang) ? cell(row, idx.lang).slice(0, 5) : undefined,
          source: 'channel',
          ref: cell(row, idx.ref) || 'Importada',
        },
        now
      );
      imported++;
    } catch {
      skipped++; // solapada o inválida
    }
  }

  return json({ ok: true, imported, skipped, total: rows.length - 1 });
};

// CSV con comillas, separador configurable y saltos de línea dentro de comillas.
function parseCSV(text: string, delim: string): string[][] {
  const out: string[][] = [];
  let field = '',
    row: string[] = [],
    inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      out.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') field += ch;
  }
  if (field.length || row.length) {
    row.push(field);
    out.push(row);
  }
  return out;
}

function toISO(s: string): string {
  s = (s || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${y}-${mo}-${d}`;
  }
  return '';
}

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
}
