import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { isFree, addBooking } from '@/lib/bookings';
import { createInvoice, setTbaiResult } from '@/lib/invoices';
import { amountCents, invoiceAmounts, nights, PRICE_PER_NIGHT } from '@/lib/pricing';

export const prerender = false;

// Crea el cobro de una reserva. Body JSON: { room, in, out, pax }.
// - Con STRIPE_SECRET_KEY: sesión real de Stripe Checkout.
// - Sin clave (modo DEMOSTRACIÓN): simula reserva + factura correlativa +
//   TicketBAI, para poder enseñar el flujo completo sin cobrar de verdad.
export const POST: APIRoute = async ({ request }) => {
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

  const key = process.env.STRIPE_SECRET_KEY;

  // ---- Modo DEMOSTRACIÓN (sin Stripe configurado) ----
  if (!key) {
    const now = new Date().toISOString();
    const booking = await addBooking(
      { room, in: inS, out: outS, pax: pax ? Number(pax) : undefined, name: 'Reserva demo', source: 'web', ref: 'demo' },
      now
    );
    const { base, iva, ivaPct, total } = invoiceAmounts(room, inS, outS);
    const inv = await createInvoice({
      fecha: now, room, in: inS, out: outS, pax: pax ? Number(pax) : undefined,
      cliente: 'Cliente de prueba', base, ivaPct, iva, total, bookingId: booking.id,
    });
    // TicketBAI SIMULADO (en real lo declara el garante).
    await setTbaiResult(inv.ref, {
      identificador: 'TBAI-DEMO-' + inv.serie + inv.numero,
      qr: 'demo', estado: 'declarada', mensaje: 'Simulación: no se ha enviado a Hacienda.',
    });
    return json({ url: `/reserva-ok?ref=${encodeURIComponent(inv.ref)}&demo=1` });
  }

  // ---- Pago real con Stripe ----
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
