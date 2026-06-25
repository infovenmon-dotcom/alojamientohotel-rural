import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { isFree } from '@/lib/bookings';
import { amountCents, nights, PRICE_PER_NIGHT } from '@/lib/pricing';

export const prerender = false;

// Crea una sesión de Stripe Checkout para una habitación y fechas concretas.
// Body JSON: { room, in, out, pax }. Devuelve { url } para redirigir al pago.
export const POST: APIRoute = async ({ request }) => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json({ error: 'pago no configurado' }, 503);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'datos inválidos' }, 400);
  }
  const { room, in: inS, out: outS, pax } = body || {};
  if (!room || !inS || !outS || !(inS < outS)) return json({ error: 'fechas inválidas' }, 400);
  if (!PRICE_PER_NIGHT[room]) return json({ error: 'habitación desconocida' }, 400);
  if (!(await isFree(room, inS, outS))) return json({ error: 'esas fechas ya no están disponibles' }, 409);

  const stripe = new Stripe(key);
  const origin = new URL(request.url).origin;
  const n = nights(inS, outS);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: amountCents(room, inS, outS),
          product_data: {
            name: `Kirana · ${room}`,
            description: `${inS} → ${outS} · ${n} noche${n > 1 ? 's' : ''}${pax ? ' · ' + pax + ' pers.' : ''}`,
          },
        },
      },
    ],
    metadata: { room, in: inS, out: outS, pax: String(pax || '') },
    success_url: `${origin}/reserva-ok?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/#habitaciones`,
  });
  return json({ url: session.url });
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
}
