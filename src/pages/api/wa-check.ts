import type { APIRoute } from 'astro';
import { readJson } from '@/lib/persist';
import { resolve } from 'node:path';

export const prerender = false;

// Diagnóstico temporal: indica qué integraciones ve la función en runtime,
// SIN exponer ningún valor secreto (sólo sí/no y longitudes). Sirve para
// confirmar que las variables de entorno están cargadas en el deploy actual.
// Borrar cuando WhatsApp funcione.
export const GET: APIRoute = async () => {
  const env = process.env;
  const body = {
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
