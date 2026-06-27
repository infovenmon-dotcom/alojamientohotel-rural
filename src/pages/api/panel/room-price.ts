import type { APIRoute } from 'astro';
import { setRoomPrice, getRoomById } from '@/lib/rooms';

export const prerender = false;

// Actualiza la tarifa (precio/noche de plataformas) de una habitación.
// Body JSON: { id, precio }. La web aplica el descuento directo (−10%) sobre esta
// tarifa. Protegido por el middleware de auth.
export const POST: APIRoute = async ({ request }) => {
  let b: any;
  try {
    b = await request.json();
  } catch {
    return json({ error: 'datos inválidos' }, 400);
  }
  const id = (b?.id || '').toString();
  const precio = Number(b?.precio);
  if (!id || !(await getRoomById(id))) return json({ error: 'habitación no encontrada' }, 404);
  if (!(precio > 0)) return json({ error: 'precio no válido' }, 400);

  const room = await setRoomPrice(id, precio);
  return json({ ok: true, id, precio: room?.precio });
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
}
