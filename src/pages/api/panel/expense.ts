import type { APIRoute } from 'astro';
import { addExpense } from '@/lib/expenses';
import { clean } from '@/lib/sanitize';

export const prerender = false;

// Alta de gasto desde el panel. Body JSON: { date, desc, cat, total, ivaPct, deducible }.
// Persiste y calcula el IVA soportado. Protegido por el middleware de auth.
export const POST: APIRoute = async ({ request }) => {
  let b: any;
  try {
    b = await request.json();
  } catch {
    return json({ error: 'datos inválidos' }, 400);
  }
  const total = Number(b?.total);
  if (!b?.desc || !b?.date || !(total > 0)) return json({ error: 'concepto, fecha e importe son obligatorios' }, 400);

  const expense = await addExpense({
    date: clean(b.date, 10),
    desc: clean(b.desc, 120),
    cat: clean(b.cat, 60) || 'Otros',
    total,
    ivaPct: Number(b.ivaPct) || 0,
    deducible: b.deducible !== false,
  });
  return json({ ok: true, expense });
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
}
