import type { APIRoute } from 'astro';
import { setRoomsActive } from '@/lib/rooms';

export const prerender = false;

// Guarda el estado COMPLETO de las habitaciones en una sola operación.
// Body JSON: { states: { argia: true, izar: false, ... } }  (id -> activa)
// El panel manda la foto completa en cada cambio: sin carreras. Protegido por auth.
export const POST: APIRoute = async ({ request }) => {
  let b: any;
  try {
    b = await request.json();
  } catch {
    return json({ error: 'datos inválidos' }, 400);
  }
  const states = b?.states;
  if (!states || typeof states !== 'object') return json({ error: 'falta el estado de las habitaciones' }, 400);

  const rooms = await setRoomsActive(states as Record<string, boolean>);
  return json({ ok: true, activas: rooms.filter((r) => r.activa).map((r) => r.nombre) });
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
}
