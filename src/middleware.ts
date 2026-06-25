import { defineMiddleware } from 'astro:middleware';
import { COOKIE, isValidSession } from '@/lib/auth';

// Endpoints públicos (reservas/disponibilidad/pago): no requieren sesión.
const PUBLIC_API = ['/api/availability', '/api/ical', '/api/checkout', '/api/sync', '/api/stripe-webhook'];

/** Protege /panel/* y la API del panel (/api/rooms). El login y los endpoints
 *  públicos de reservas quedan abiertos. */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isPanel = pathname.startsWith('/panel');
  const isPublicApi = PUBLIC_API.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '.'));
  const isApi = pathname.startsWith('/api') && !isPublicApi;
  const isLogin = pathname === '/panel/login';

  if ((isPanel || isApi) && !isLogin) {
    const ok = isValidSession(context.cookies.get(COOKIE)?.value);
    if (!ok) {
      if (isApi) return new Response('No autorizado', { status: 401 });
      return context.redirect('/panel/login');
    }
  }
  return next();
});
