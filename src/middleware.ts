import { defineMiddleware } from 'astro:middleware';
import { COOKIE, isValidSession } from '@/lib/auth';

/** Protege /panel/* y /api/* (salvo el login). Redirige a /panel/login. */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isPanel = pathname.startsWith('/panel');
  const isApi = pathname.startsWith('/api');
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
