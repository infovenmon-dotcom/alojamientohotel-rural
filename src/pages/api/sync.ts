import type { APIRoute } from 'astro';
import { getIcalUrls, setExternal } from '@/lib/bookings';
import { parseICS } from '@/lib/ical';

export const prerender = false;

// Importa los iCal de Booking (uno por habitación) y guarda los bloqueos.
// Se puede llamar a mano (GET) o desde la función programada de Netlify.
// Las URLs salen del store (panel) o de la variable BOOKING_ICAL_URLS (JSON).
export const GET: APIRoute = async () => {
  let urls = await getIcalUrls();
  if ((!urls || !Object.keys(urls).length) && process.env.BOOKING_ICAL_URLS) {
    try {
      urls = JSON.parse(process.env.BOOKING_ICAL_URLS);
    } catch {
      /* ignora JSON inválido */
    }
  }
  const result: Record<string, number> = {};
  for (const [room, url] of Object.entries(urls || {})) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        result[room] = -1;
        continue;
      }
      const ranges = parseICS(await res.text());
      await setExternal(room, ranges);
      result[room] = ranges.length;
    } catch {
      result[room] = -1;
    }
  }
  return new Response(JSON.stringify({ ok: true, imported: result }), {
    headers: { 'content-type': 'application/json' },
  });
};
