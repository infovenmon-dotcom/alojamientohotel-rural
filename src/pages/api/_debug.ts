import type { APIRoute } from 'astro';
import { getAllRooms } from '@/lib/rooms';

export const prerender = false;

// Diagnóstico temporal: ¿funciona Netlify Blobs? ¿qué estado ven el servidor?
// Abrir /api/_debug en el navegador. (Se quita cuando esté resuelto.)
export const GET: APIRoute = async () => {
  const out: Record<string, unknown> = {};

  // 1) ¿Blobs disponible? Prueba escribir y leer una clave.
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('kirana');
    const probe = new Date().toISOString();
    await store.setJSON('_debug_probe', { probe });
    const back = (await store.get('_debug_probe', { type: 'json' })) as { probe?: string } | null;
    out.blobs = back && back.probe === probe ? 'OK (escribe y lee)' : 'FALLA (lee distinto: ' + JSON.stringify(back) + ')';
  } catch (e) {
    out.blobs = 'NO disponible: ' + (e instanceof Error ? e.name + ' · ' + e.message : String(e));
  }

  // 2) ¿Qué habitaciones ve el servidor (la fuente que pinta la web)?
  try {
    const rooms = await getAllRooms();
    out.rooms = rooms.map((r) => `${r.id}:${r.activa ? 'ACTIVA' : 'bloqueada'}`);
    out.activas = rooms.filter((r) => r.activa).map((r) => r.nombre);
  } catch (e) {
    out.rooms = 'ERROR: ' + (e instanceof Error ? e.message : String(e));
  }

  out.now = new Date().toISOString();
  return new Response(JSON.stringify(out, null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
};
