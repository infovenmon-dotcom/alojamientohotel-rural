/**
 * Cliente mínimo de la API de Claude (Anthropic) para el panel.
 *
 * - La clave va SIEMPRE en la variable de entorno ANTHROPIC_API_KEY (nunca en
 *   el código). Sin clave, hasClaude() es false y cada función ofrece un
 *   respaldo razonable para que el panel siga funcionando en modo demo.
 * - Modelo configurable con CLAUDE_MODEL (por defecto claude-sonnet-4-6:
 *   buena calidad multilingüe a un coste contenido; el cliente paga su consumo).
 */
const API = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

export function hasClaude(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** Llama a Claude y devuelve el texto. `null` si no hay clave configurada. */
export async function claudeText(
  system: string,
  user: string,
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 1,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Claude API ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data: any = await res.json();
  return (data?.content || []).map((c: any) => c?.text || '').join('').trim();
}

/** Igual que claudeText pero parsea la respuesta como JSON (tolera ```json … ```). */
export async function claudeJSON<T>(
  system: string,
  user: string,
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<T | null> {
  const txt = await claudeText(system + '\n\nResponde SOLO con JSON válido, sin texto adicional.', user, opts);
  if (txt == null) return null;
  const cleaned = txt.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}
