import type { APIRoute } from 'astro';
import { readJson } from '@/lib/persist';
import { resolve } from 'node:path';
import { sendWhatsApp } from '@/lib/whatsapp';

export const prerender = false;

// Diagnóstico temporal: indica qué integraciones ve la función en runtime,
// SIN exponer ningún valor secreto (sólo sí/no y longitudes). Sirve para
// confirmar que las variables de entorno están cargadas en el deploy actual.
// Con ?send=<numero> dispara un ENVÍO real de prueba (probar nuestra salida
// sin depender de que Meta nos entregue un mensaje). Borrar cuando funcione.
export const GET: APIRoute = async ({ url }) => {
  const env = process.env;
  const sendTo = url.searchParams.get('send');
  let selfTest: any = null;
  if (sendTo) {
    selfTest = await sendWhatsApp(sendTo.replace(/[^0-9]/g, ''), 'Prueba de Kirana ✅ Si recibes esto, el envío funciona.');
  }
  const body = {
    self_test_send: selfTest,
    whatsapp_token: !!env.WHATSAPP_TOKEN,
    whatsapp_token_len: (env.WHATSAPP_TOKEN || '').length,
    whatsapp_phone_id: !!env.WHATSAPP_PHONE_ID,
    whatsapp_phone_id_value: env.WHATSAPP_PHONE_ID || null, // identificador, no es secreto
    whatsapp_verify_token: !!env.WHATSAPP_VERIFY_TOKEN,
    whatsapp_app_secret: !!env.WHATSAPP_APP_SECRET,
    anthropic_api_key: !!env.ANTHROPIC_API_KEY,
    context: env.CONTEXT || null, // 'production' | 'branch-deploy' | ...
    last_send: await readJson<any>('wadebug', null, resolve(process.cwd(), 'src/data/wadebug.json')),
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'content-type': 'application/json' },
  });
};
