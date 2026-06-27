import type { APIRoute } from 'astro';
import { isFree, addBooking } from '@/lib/bookings';
import { clean } from '@/lib/sanitize';

export const prerender = false;

// Alta de reserva manual desde el panel. Body JSON: { room, in, out, guests, name, ch }.
// Persiste en el store y bloquea esas fechas en la web pública. Protegido por
// el middleware de auth (toda /api salvo la lista pública).
export const POST: APIRoute = async ({ request }) => {
  let b: any;
  try {
    b = await request.json();
  } catch {
    return json({ error: 'datos inválidos' }, 400);
  }
  const { room, in: inS, out: outS, guests, name, ch } = b || {};
  if (!room || !inS || !outS || !(inS < outS)) return json({ error: 'fechas inválidas' }, 400);
  if (!(await isFree(room, inS, outS))) return json({ error: 'esas fechas ya están ocupadas' }, 409);

  const booking = await addBooking(
    {
      room,
      in: inS,
      out: outS,
      pax: guests ? Number(guests) : undefined,
      name: clean(name, 120) || 'Reserva',
      source: 'manual',
      ref: clean(ch, 40) || 'Directa',
    },
    new Date().toISOString()
  );
  return json({ ok: true, booking });
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
}
