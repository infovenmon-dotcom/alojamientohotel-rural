import type { APIRoute } from 'astro';
import { checkPassword, setPassword, sessionToken, COOKIE } from '@/lib/auth';

export const prerender = false;

// Cambia la contraseña del panel. Body JSON: { current, next }.
// Verifica la actual, exige mínimo 8 caracteres y guarda la nueva (hasheada).
// Devuelve una cookie nueva para no expulsar al admin tras el cambio.
// Protegido por el middleware de auth (sólo con sesión válida).
export const POST: APIRoute = async ({ request, cookies }) => {
  let b: any;
  try {
    b = await request.json();
  } catch {
    return json({ error: 'datos inválidos' }, 400);
  }
  const current = String(b?.current ?? '');
  const next = String(b?.next ?? '');
  if (!(await checkPassword(current))) return json({ error: 'la contraseña actual no es correcta' }, 403);
  if (next.length < 8) return json({ error: 'la nueva contraseña debe tener al menos 8 caracteres' }, 400);
  if (next === current) return json({ error: 'la nueva contraseña debe ser distinta de la actual' }, 400);

  await setPassword(next);
  // Renovamos la cookie con el secreto nuevo (la firma depende del hash actual).
  cookies.set(COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 8,
  });
  return json({ ok: true });
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
}
