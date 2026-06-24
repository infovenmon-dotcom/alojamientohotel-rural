import type { APIRoute } from 'astro';
import { setRoomActive, getRoomById } from '@/lib/roomsStore';

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
  setRoomActive(id, activa);

  // Si viene de un formulario del panel, volver a Habitaciones.
  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('text/html')) return redirect('/panel/habitaciones');
  return new Response(JSON.stringify({ id, activa }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
