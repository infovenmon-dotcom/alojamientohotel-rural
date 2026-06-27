import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { addBooking } from '@/lib/bookings';

export const prerender = false;

// Webhook de Stripe: al completarse el pago, registra la reserva (bloquea esas
// fechas en la web y en el iCal que importa Booking). Configura el endpoint en
// Stripe → Developers → Webhooks apuntando a /api/stripe-webhook.
export const POST: APIRoute = async ({ request }) => {
  const key = process.env.STRIPE_SECRET_KEY;
  const wh = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !wh) return new Response('no configurado', { status: 503 });

  const stripe = new Stripe(key);
  const sig = request.headers.get('stripe-signature') || '';
  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, wh);
  } catch {
    return new Response('firma inválida', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    const m = s.metadata || {};
    if (m.room && m.in && m.out) {
      try {
        await addBooking(
          {
            room: m.room,
            in: m.in,
            out: m.out,
            pax: m.pax ? Number(m.pax) : undefined,
            name: m.name || s.customer_details?.name || s.customer_details?.email || 'Web',
            email: m.email || s.customer_details?.email || undefined,
            phone: m.phone || s.customer_details?.phone || undefined,
            nif: m.nif || undefined,
            address: m.address || undefined,
            source: 'stripe',
            ref: s.id,
          },
          new Date(event.created * 1000).toISOString()
        );
      } catch {
        // Si solapó por una reserva simultánea, hay que reembolsar manualmente.
        return new Response('solape', { status: 200 });
      }
    }
  }
  return new Response('ok', { status: 200 });
};
