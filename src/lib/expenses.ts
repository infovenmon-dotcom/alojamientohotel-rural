import { resolve } from 'node:path';
import seed from '../data/expenses.json';
import { readJson, writeJson } from './persist';

/**
 * Gastos con IVA soportado (deducible) para la contabilidad. El IVA a liquidar
 * = IVA repercutido (facturas) − IVA soportado (gastos deducibles).
 *
 * Persistencia: Netlify Blobs en Netlify, fichero en local, semilla de respaldo.
 */
export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  desc: string;
  cat: string;
  total: number; // importe pagado (IVA incl.)
  ivaPct: number; // % IVA
  iva: number; // cuota IVA soportado (€)
  deducible: boolean; // si su IVA es deducible aquí
}
interface ExpensesFile {
  expenses: Expense[];
}

const KEY = 'expenses';

function filePath(): string {
  // Solo se usa en local/Node (en Netlify se usa Blobs).
  return resolve(process.cwd(), 'src/data/expenses.json');
}
async function read(): Promise<ExpensesFile> {
  return readJson<ExpensesFile>(KEY, seed as ExpensesFile, filePath());
}
async function write(data: ExpensesFile): Promise<void> {
  return writeJson(KEY, data, filePath());
}

export async function listExpenses(): Promise<Expense[]> {
  return (await read()).expenses;
}

/** Añade un gasto. El IVA soportado se calcula a partir del total y el %. */
export async function addExpense(
  data: Omit<Expense, 'id' | 'iva'> & { iva?: number }
): Promise<Expense> {
  const d = await read();
  const deducible = data.deducible && data.ivaPct > 0;
  const iva = deducible ? Math.round((data.total - data.total / (1 + data.ivaPct / 100)) * 100) / 100 : 0;
  const exp: Expense = {
    id: 'exp_' + data.date.replace(/-/g, '') + '_' + (d.expenses.length + 1),
    date: data.date,
    desc: data.desc,
    cat: data.cat,
    total: data.total,
    ivaPct: data.ivaPct,
    iva,
    deducible,
  };
  d.expenses.push(exp);
  await write(d);
  return exp;
}
