import type { APIRoute } from 'astro';
import { listBookings } from '@/lib/bookings';
import { toICS } from '@/lib/ical';

export const prerender = false;

// Feed iCal por habitación para que Booking.com lo IMPORTE (sincronizar
// calendarios). URL: /api/ical/Argia.ics
export const GET: APIRoute = async ({ params }) => {
  const room = decodeURIComponent(params.room || '');
  const ics = toICS(room, await listBookings());
  return new Response(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `inline; filename="${room}.ics"`,
    },
  });
};
