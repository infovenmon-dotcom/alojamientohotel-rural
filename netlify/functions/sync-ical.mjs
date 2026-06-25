// Función programada de Netlify: cada hora pide a /api/sync que importe los
// iCal de Booking y actualice la disponibilidad. (Netlify detecta esta carpeta.)
export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL;
  if (!base) return new Response('no base url', { status: 200 });
  try {
    const r = await fetch(base + '/api/sync');
    return new Response('sync: ' + r.status, { status: 200 });
  } catch (e) {
    return new Response('sync error', { status: 200 });
  }
};

export const config = { schedule: '@hourly' };
