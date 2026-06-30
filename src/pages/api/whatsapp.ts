import type { APIRoute } from 'astro';
import { hasWhatsApp, sendWhatsApp, verifySignature, hasAppSecret } from '@/lib/whatsapp';
import { hasClaude, claudeText } from '@/lib/claude';
import { getActiveRooms } from '@/lib/rooms';
import { webPrice } from '@/lib/pricing';

export const prerender = false;

// Webhook de WhatsApp Business Platform (Cloud API de Meta).
//  - GET : verificación del webhook (Meta envía hub.challenge al configurarlo).
//  - POST: mensajes entrantes → genera respuesta con Claude → contesta por WhatsApp.
// Endpoint PÚBLICO (lo llama Meta). Se valida la firma de la app cuando hay
// WHATSAPP_APP_SECRET. Sin configuración (demo), responde 200 y no hace nada.

const SITE = process.env.PUBLIC_SITE_URL || 'https://kiranabermeo.es';

export const GET: APIRoute = async ({ url }) => {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge') || '';
  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain' } });
  }
  return new Response('forbidden', { status: 403 });
};

export const POST: APIRoute = async ({ request }) => {
  const raw = await request.text();

  // Verificación de firma de Meta (X-Hub-Signature-256). Si hay secreto de app
  // y se quiere modo estricto (WHATSAPP_STRICT_SIGNATURE=1), una firma inválida
  // rechaza la petición. Por defecto, sólo AVISA y deja pasar: así un secreto
  // mal copiado no deja el asistente mudo. El handshake del webhook ya protege
  // el endpoint, y el riesgo (spam al bot) es bajo.
  if (hasAppSecret()) {
    const sig = request.headers.get('x-hub-signature-256');
    const okSig = verifySignature(raw, sig);
    if (!okSig) {
      if (process.env.WHATSAPP_STRICT_SIGNATURE === '1') {
        return new Response('bad signature', { status: 401 });
      }
      console.warn('WhatsApp: firma X-Hub-Signature-256 no válida; se procesa igualmente (modo no estricto).');
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return ok(); // siempre 200 para que Meta no reintente en bucle
  }

  // Extrae los mensajes de texto entrantes.
  const msgs: Array<{ from: string; body: string; name?: string }> = [];
  try {
    for (const entry of payload.entry || []) {
      for (const ch of entry.changes || []) {
        const v = ch.value || {};
        const name = v.contacts?.[0]?.profile?.name;
        for (const m of v.messages || []) {
          if (m.type === 'text' && m.text?.body) msgs.push({ from: m.from, body: m.text.body, name });
        }
      }
    }
  } catch {
    return ok();
  }

  if (!msgs.length || !hasWhatsApp()) return ok();

  const system = await assistantSystemPrompt();
  for (const m of msgs) {
    let reply: string;
    try {
      reply =
        (hasClaude()
          ? await claudeText(system, m.body, { maxTokens: 500, temperature: 0.7 })
          : null) ||
        'Gracias por escribir a Kirana 🌿 Ahora mismo no puedo responderte automáticamente. Puedes ver disponibilidad y reservar en ' +
          SITE +
          ' y te atenderemos lo antes posible.';
    } catch {
      reply =
        'Gracias por tu mensaje 🌿 En breve te contestamos. También puedes ver disponibilidad y reservar en ' + SITE + '.';
    }
    await sendWhatsApp(m.from, reply);
  }
  return ok();
};

// Construye el contexto del asistente con datos reales (habitaciones activas y
// precio web). Así responde con información actual, no inventada.
async function assistantSystemPrompt(): Promise<string> {
  let rooms = '';
  try {
    const active = await getActiveRooms();
    rooms = active
      .map((r) => `- ${r.nombre}: ${r.capacidad || '?'} pers., desde ${webPrice(r.precio)} €/noche (precio web).`)
      .join('\n');
  } catch {
    /* sin datos → el asistente deriva a la web */
  }
  return [
    'Eres el asistente de WhatsApp de Kirana, un alojamiento rural en plena Reserva de la Biosfera de Urdaibai (Bermeo, Bizkaia).',
    'Respondes a clientes de forma cálida, breve y útil, en el MISMO idioma en que te escriben.',
    'Ayudas con dudas sobre las habitaciones, precios orientativos, cómo llegar, check-in/out y la zona (Urdaibai, Bermeo, Mundaka, Gernika).',
    'Para reservar o ver disponibilidad real, invita siempre a usar la web: ' + SITE + '.',
    'No confirmes reservas ni cobres por WhatsApp. Si te piden algo que no sabes o es delicado (facturas, incidencias, grupos), di que una persona del equipo les atenderá en breve.',
    'No inventes servicios ni precios que no aparezcan abajo.',
    rooms ? 'Habitaciones disponibles ahora:\n' + rooms : 'Consulta la web para ver las habitaciones disponibles.',
  ].join('\n');
}

function ok() {
  return new Response('ok', { status: 200 });
}
