import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { isFree, addBooking } from '@/lib/bookings';
import { createInvoice, setTbaiResult } from '@/lib/invoices';
import { getAllRooms } from '@/lib/rooms';
import { amountCentsFor, invoiceAmountsFor, nights, webPrice } from '@/lib/pricing';
import { sendEmail, bookingEmail } from '@/lib/email';
import { clean } from '@/lib/sanitize';

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
  // Anti-bot: campo trampa (honeypot) invisible para humanos. Si viene relleno,
  // es un bot. Respondemos como si todo fuese bien para no darle pistas.
  if (body?.website || body?.kbHp) {
    return json({ url: '/reserva-ok?demo=1' });
  }
  const { room, in: inS, out: outS, pax } = body || {};
  // Datos del cliente (capturados en el formulario de reserva).
  const name = clean(body?.name, 120);
  const email = clean(body?.email, 160).toLowerCase();
  const phone = clean(body?.phone, 40);
  const nif = clean(body?.nif, 20); // opcional (factura con NIF)
  const address = clean(body?.address, 200); // opcional
  const lang = clean(body?.lang || 'es', 5); // idioma del cliente
  const consent = body?.consent === true || body?.consent === 'true'; // marketing
  if (!room || !inS || !outS || !(inS < outS)) return json({ error: 'fechas inválidas' }, 400);
  const roomData = (await getAllRooms()).find((r) => r.nombre === room);
  if (!roomData) return json({ error: 'habitación desconocida' }, 400);
  if (!name || !email || !phone) return json({ error: 'faltan tus datos (nombre, email y teléfono)' }, 400);
  if (!(await isFree(room, inS, outS))) return json({ error: 'esas fechas ya no están disponibles' }, 409);

  const nightWeb = webPrice(roomData.precio); // precio/noche en la web (tarifa OTA − 10%)

  const key = process.env.STRIPE_SECRET_KEY;

  // ---- Modo DEMOSTRACIÓN (sin Stripe configurado) ----
  if (!key) {
    const now = new Date().toISOString();
    const booking = await addBooking(
      { room, in: inS, out: outS, pax: pax ? Number(pax) : undefined, name, email, phone, nif: nif || undefined, address: address || undefined, lang, consent, source: 'web', ref: 'demo' },
      now
    );
    const { base, iva, ivaPct, total } = invoiceAmountsFor(nightWeb, inS, outS);
    const inv = await createInvoice({
      fecha: now, room, in: inS, out: outS, pax: pax ? Number(pax) : undefined,
      cliente: name, nif: nif || undefined, direccion: address || undefined, base, ivaPct, iva, total, bookingId: booking.id,
    });
    // TicketBAI SIMULADO (en real lo declara el garante).
    await setTbaiResult(inv.ref, {
      identificador: 'TBAI-DEMO-' + inv.serie + inv.numero,
      qr: 'demo', estado: 'declarada', mensaje: 'Simulación: no se ha enviado a Hacienda.',
    });
    // Email de confirmación (si BREVO_API_KEY; si no, se omite en demo).
    try {
      const em = bookingEmail(lang, { name, room, in: inS, out: outS, nights: nights(inS, outS), total });
      await sendEmail({ to: email, name, subject: em.subject, html: em.html });
    } catch {
      /* el email no debe bloquear la reserva */
    }
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
          unit_amount: amountCentsFor(nightWeb, inS, outS),
          product_data: {
            name: `Kirana · ${room}`,
            description: `${inS} → ${outS} · ${n} noche${n > 1 ? 's' : ''}${pax ? ' · ' + pax + ' pers.' : ''}`,
          },
        },
      },
    ],
    customer_email: email || undefined,
    phone_number_collection: { enabled: true },
    metadata: { room, in: inS, out: outS, pax: String(pax || ''), name, email, phone, nif, address, lang, consent: String(consent), total: String(nightWeb * nights(inS, outS)) },
    success_url: `${origin}/reserva-ok?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/#habitaciones`,
  });
  return json({ url: session.url });
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
}
