import type { APIRoute } from 'astro';
import { createResetToken } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { lockedSeconds, registerFail } from '@/lib/loginGuard';

export const prerender = false;

// "He olvidado la contraseña". Genera un enlace de restablecimiento de un solo
// uso (válido 1 h) y lo envía SIEMPRE a ADMIN_EMAIL (el correo del dueño), nunca
// a una dirección que mande quien llama: así nadie ajeno puede recibir el enlace.
// Respuesta genérica para no revelar si hay email configurado. Endpoint público
// (en el middleware), pero limitado por IP para evitar abusos.
export const POST: APIRoute = async ({ clientAddress }) => {
  const ip = clientAddress || 'desconocida';
  const now = Date.now();
  // Reaprovechamos el anti fuerza bruta: máximo unos pocos intentos por IP.
  if ((await lockedSeconds(ip, now)) > 0) {
    return json({ ok: true }); // respuesta genérica aunque esté limitado
  }
  await registerFail(ip, now);

  const admin = process.env.ADMIN_EMAIL;
  const base = process.env.PUBLIC_SITE_URL || 'https://kiranabermeo.es';
  if (admin) {
    try {
      const token = await createResetToken();
      const link = `${base.replace(/\/$/, '')}/panel/reset?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: admin,
        name: 'Kirana',
        subject: 'Restablecer la contraseña del panel · Kirana',
        html:
          '<p>Has solicitado restablecer la contraseña del panel de Kirana.</p>' +
          `<p><a href="${link}">Pulsa aquí para elegir una contraseña nueva</a> (válido 1 hora).</p>` +
          '<p>Si no has sido tú, ignora este email: la contraseña no cambia hasta que uses el enlace.</p>',
      });
    } catch {
      /* no revelamos errores de envío */
    }
  }
  return json({ ok: true });
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
}
