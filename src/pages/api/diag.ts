import type { APIRoute } from 'astro';
import { getAllRooms, getActiveRooms } from '@/lib/rooms';
import { getBookedMap } from '@/lib/bookings';

export const prerender = false;

// Diagnóstico temporal. Abrir /api/diag en el navegador. (Se quita al resolver.)
export const GET: APIRoute = async ({ request }) => {
  const out: Record<string, unknown> = {};

  // 1) ¿Blobs escribe y lee?
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('kirana');
    const probe = new Date().toISOString();
    await store.setJSON('_diag_probe', { probe });
    const back = (await store.get('_diag_probe', { type: 'json' })) as { probe?: string } | null;
    out.blobs = back && back.probe === probe ? 'OK (escribe y lee)' : 'FALLA';
  } catch (e) {
    out.blobs = 'NO: ' + (e instanceof Error ? e.name + ' · ' + e.message : String(e));
  }

  // 2) Estado que ve el servidor.
  try {
    out.activas = (await getActiveRooms()).map((r) => r.nombre);
    out.todas = (await getAllRooms()).map((r) => `${r.id}:${r.activa ? 'A' : 'b'}`);
  } catch (e) {
    out.roomsError = e instanceof Error ? e.message : String(e);
  }

  // 3) ¿getBookedMap falla? (si falla, antes tumbaba la inyección de la home)
  try {
    const bm = await getBookedMap();
    out.bookedMap = 'OK (' + Object.keys(bm).length + ' habitaciones con reservas)';
  } catch (e) {
    out.bookedMap = 'ERROR: ' + (e instanceof Error ? e.message : String(e));
  }

  // 4) ¿Qué sirve la HOME de verdad? (fetch fresco, sin caché)
  try {
    const origin = new URL(request.url).origin;
    const r = await fetch(origin + '/?diag=' + Date.now(), { headers: { 'cache-control': 'no-cache' } });
    const h = await r.text();
    out.home = {
      status: r.status,
      tieneInyeccion: h.includes('window.KIRANA_AVAIL'),
      errorInyeccion: (h.match(/KIRANA_AVAIL inject error:[^>]*/) || [null])[0],
      habitacionesEnInyeccion: (h.match(/"id":"/g) || []).length,
      cacheControl: r.headers.get('cache-control'),
    };
  } catch (e) {
    out.home = 'fetch error: ' + (e instanceof Error ? e.message : String(e));
  }

  out.now = new Date().toISOString();
  return new Response(JSON.stringify(out, null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
};
