import { defineMiddleware } from 'astro:middleware';
import { COOKIE, isValidSession } from '@/lib/auth';

// Endpoints públicos (reservas/disponibilidad/pago): no requieren sesión.
const PUBLIC_API = ['/api/availability', '/api/ical', '/api/checkout', '/api/sync', '/api/stripe-webhook', '/api/panel/recover', '/api/whatsapp', '/api/wa-check'];

// Cabeceras de seguridad para todas las respuestas.
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "img-src 'self' data: https://l.icdbcdn.com https://api.qrserver.com https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "script-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
  ].join('; '),
};

/** Protege /panel/* y la API del panel; el login y los endpoints públicos de
 *  reservas quedan abiertos. Además añade cabeceras de seguridad a todo. */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isPanel = pathname.startsWith('/panel');
  const isPublicApi = PUBLIC_API.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '.'));
  const isApi = pathname.startsWith('/api') && !isPublicApi;
  const isLogin = pathname === '/panel/login' || pathname === '/panel/reset';

  if ((isPanel || isApi) && !isLogin) {
    const ok = await isValidSession(context.cookies.get(COOKIE)?.value);
    if (!ok) {
      if (isApi) return new Response('No autorizado', { status: 401 });
      return context.redirect('/panel/login');
    }
  }

  const response = await next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) response.headers.set(k, v);
  return response;
});
