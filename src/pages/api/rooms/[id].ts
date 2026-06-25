import type { APIRoute } from 'astro';
import { setRoomActive, getRoomById } from '@/lib/roomsStore';

export const prerender = false;

/**
 * POST /api/rooms/:id  — activa/bloquea una habitación y persiste.
 * Acepta JSON ({ activa: true|false }) o formulario (activa=true|false).
 * La web pública (SSR) lo refleja en la siguiente petición.
 * Protegido por el middleware de auth.
 */
export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id!;
  if (!(await getRoomById(id))) {
    return new Response('Habitación no encontrada', { status: 404 });
  }
  const ct = request.headers.get('content-type') ?? '';
  let activa: boolean;
  if (ct.includes('application/json')) {
    const b = await request.json().catch(() => ({}));
    activa = b.activa === true || b.activa === 'true';
  } else {
    const form = await request.formData();
    activa = String(form.get('activa')) === 'true';
  }
  try {
    await setRoomActive(id, activa);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al guardar';
    return new Response(JSON.stringify({ error: msg }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ id, activa }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
