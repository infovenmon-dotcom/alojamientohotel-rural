import type { APIRoute } from 'astro';
import { setRoomActive, getRoomById } from '@/lib/roomsStore';

export const prerender = false;

/**
 * POST /api/rooms/:id  (form: activa=true|false)
 * Bloquea/activa una habitación y persiste. La web pública (SSR) lo refleja
 * en la siguiente petición. Protegido por el middleware de auth.
 */
export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id!;
  if (!getRoomById(id)) {
    return new Response('Habitación no encontrada', { status: 404 });
  }
  const form = await request.formData();
  const activa = String(form.get('activa')) === 'true';
  const accept = request.headers.get('accept') ?? '';
  try {
    setRoomActive(id, activa);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al guardar';
    if (accept.includes('text/html')) {
      return redirect('/panel/habitaciones?error=' + encodeURIComponent(msg));
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Si viene de un formulario del panel, volver a Habitaciones.
  if (accept.includes('text/html')) return redirect('/panel/habitaciones');
  return new Response(JSON.stringify({ id, activa }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
