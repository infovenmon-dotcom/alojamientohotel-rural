import type { APIRoute } from 'astro';
import { getActiveRooms } from '@/lib/rooms';
import { getBookedMap } from '@/lib/bookings';

export const prerender = false;

// Disponibilidad pública para el calendario: habitaciones activas + fechas
// ocupadas (reservas propias + bloqueos importados de Booking).
export const GET: APIRoute = async () => {
  const activeNames = (await getActiveRooms()).map((r) => r.nombre);
  const booked = await getBookedMap();
  return new Response(JSON.stringify({ activeNames, booked }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' },
  });
};
