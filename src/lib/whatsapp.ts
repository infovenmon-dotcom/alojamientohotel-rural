import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Integración con WhatsApp Business Platform (Cloud API de Meta).
 *
 * Variables de entorno (todas privadas, nunca en el código):
 *  - WHATSAPP_TOKEN        : token de acceso de la app de Meta.
 *  - WHATSAPP_PHONE_ID     : ID del número de teléfono (no el número, su ID).
 *  - WHATSAPP_VERIFY_TOKEN : cadena que elegimos nosotros para verificar el webhook.
 *  - WHATSAPP_APP_SECRET   : secreto de la app, para validar la firma de Meta.
 *
 * Sin estas variables, hasWhatsApp() es false y el webhook no enviará nada
 * (modo demo): se puede tener el código listo y activarlo cuando esté el alta.
 */
const GRAPH = 'https://graph.facebook.com/v21.0';

export function hasWhatsApp(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

export interface SendResult {
  ok: boolean;
  status?: number;
  error?: string;
}

/** Envía un mensaje de texto por WhatsApp. Devuelve el detalle del resultado. */
export async function sendWhatsApp(to: string, body: string): Promise<SendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId || !to || !body) return { ok: false, error: 'falta token/phoneId/destinatario/cuerpo' };
  try {
    const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { preview_url: false, body: body.slice(0, 4000) },
      }),
    });
    if (res.ok) return { ok: true, status: res.status };
    const txt = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: txt.slice(0, 600) };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e).slice(0, 300) };
  }
}

/**
 * Valida la firma X-Hub-Signature-256 que envía Meta (HMAC-SHA256 del cuerpo
 * crudo con el secreto de la app). Si no hay secreto configurado, no podemos
 * validar y devolvemos false (el webhook decidirá si lo exige).
 */
export function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signature) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function hasAppSecret(): boolean {
  return !!process.env.WHATSAPP_APP_SECRET;
}
