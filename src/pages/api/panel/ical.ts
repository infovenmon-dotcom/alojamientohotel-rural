import type { APIRoute } from 'astro';
import { setIcalUrls } from '@/lib/bookings';

export const prerender = false;

// Guarda las URLs iCal de importación por habitación (Booking/Airbnb/Lodgify…).
// Body JSON: { urls: { "Argia": "https://…ics", ... } }. Protegido por auth.
export const POST: APIRoute = async ({ request }) => {
  let b: any;
  try {
    b = await request.json();
  } catch {
    return json({ error: 'datos inválidos' }, 400);
  }
  const urls = b?.urls;
  if (!urls || typeof urls !== 'object') return json({ error: 'faltan las URLs' }, 400);
  const clean: Record<string, string> = {};
  for (const [room, url] of Object.entries(urls)) {
    const u = String(url || '').trim();
    if (u) clean[room] = u;
  }
  await setIcalUrls(clean);
  return json({ ok: true, count: Object.keys(clean).length });
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
}
