import type { APIRoute } from 'astro';
import { hasClaude, claudeJSON } from '@/lib/claude';
import { clean } from '@/lib/sanitize';

export const prerender = false;

// Genera una respuesta a una reseña con la API de Claude. Body JSON:
// { author, platform, rating, lang, text, previous? }.
// Devuelve { textES, replyES, reply, source }:
//   - textES : la reseña original traducida al español (para que Fran la entienda)
//   - replyES: la respuesta redactada en español (lo que se contesta, en su idioma)
//   - reply  : esa misma respuesta en el idioma del cliente (lo que se publica)
// Cada llamada produce una respuesta DISTINTA (temperatura alta + se evita repetir
// la anterior). Sin ANTHROPIC_API_KEY responde { source:'demo' } y el panel usa
// su plantilla local. Protegido por el middleware de auth.
export const POST: APIRoute = async ({ request }) => {
  let b: any;
  try {
    b = await request.json();
  } catch {
    return json({ error: 'datos inválidos' }, 400);
  }
  const author = clean(b?.author, 80) || 'huésped';
  const platform = clean(b?.platform, 30) || 'la plataforma';
  const rating = Number(b?.rating) || 0;
  const lang = (clean(b?.lang, 5) || 'es').slice(0, 2).toLowerCase();
  const text = clean(b?.text, 1500);
  const previous = clean(b?.previous, 1500);
  if (!text) return json({ error: 'falta el texto de la reseña' }, 400);

  if (!hasClaude()) return json({ source: 'demo' });

  const langName =
    ({ es: 'español', eu: 'euskera', fr: 'francés', en: 'inglés', de: 'alemán', it: 'italiano', nl: 'neerlandés', pt: 'portugués' } as Record<string, string>)[lang] || lang;

  const system =
    'Eres quien responde las reseñas de Kirana, un alojamiento rural en plena Reserva de Urdaibai (Bermeo, Bizkaia). ' +
    'Tu tono es cálido, cercano, agradecido y natural, nunca robótico ni de plantilla. Personalizas con el nombre y con algún detalle concreto de lo que cuenta el huésped. ' +
    'En reseñas negativas o tibias: agradeces, te disculpas con elegancia, reconoces el punto y mencionas que se mejora, sin excusas largas. ' +
    'Firmas como «el equipo de Kirana». Respuestas breves (2-4 frases). No inventes servicios que no se mencionan.';

  const user = [
    `Reseña de ${author} en ${platform}. Valoración: ${rating}/5. Idioma del cliente: ${langName} (${lang}).`,
    `Texto original de la reseña:\n"""${text}"""`,
    previous ? `Ya se generó antes esta respuesta; haz una DIFERENTE (otras palabras y enfoque):\n"""${previous}"""` : '',
    'Devuelve un JSON con exactamente estas claves:',
    '- "textES": la reseña original traducida al español (si ya está en español, repítela tal cual).',
    '- "replyES": tu respuesta redactada en español.',
    `- "reply": esa misma respuesta traducida al idioma del cliente (${langName}). Si el cliente escribe en español, "reply" y "replyES" deben coincidir.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const out = await claudeJSON<{ textES?: string; replyES?: string; reply?: string }>(system, user, {
      maxTokens: 900,
      temperature: 1,
    });
    if (!out?.replyES) throw new Error('respuesta vacía');
    const replyES = String(out.replyES).trim();
    const reply = (out.reply ? String(out.reply) : replyES).trim();
    const textES = (out.textES ? String(out.textES) : text).trim();
    return json({ source: 'ia', textES, replyES, reply });
  } catch (e: any) {
    return json({ error: 'No se pudo generar con IA: ' + (e?.message || 'error'), source: 'error' }, 502);
  }
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
}
