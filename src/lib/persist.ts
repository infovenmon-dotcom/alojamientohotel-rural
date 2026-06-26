/**
 * Persistencia JSON robusta para los stores (rooms, bookings, invoices, expenses).
 *
 * Estrategia (sin depender de variables de entorno, que en Netlify no están
 * disponibles en tiempo de ejecución de la función):
 *  1) Netlify Blobs si el runtime lo ofrece (producción en Netlify).
 *  2) Fichero local en disco (desarrollo / servidor Node con escritura).
 *  3) Semilla del bundle (solo lectura): se sirve, pero no se puede guardar.
 */
const BLOB_STORE = 'kirana';

export async function readJson<T>(key: string, seed: T, localPath: string): Promise<T> {
  // 1) Netlify Blobs (si hay contexto, p. ej. función de Netlify).
  try {
    const { getStore } = await import('@netlify/blobs');
    const data = (await getStore(BLOB_STORE).get(key, { type: 'json' })) as T | null;
    return data ?? seed; // Blobs disponible; si aún no hay datos, semilla.
  } catch {
    /* no estamos en Netlify o Blobs no disponible → seguimos */
  }
  // 2) Fichero local.
  try {
    const { readFileSync } = await import('node:fs');
    return JSON.parse(readFileSync(localPath, 'utf8')) as T;
  } catch {
    /* sin disco (hosting de solo lectura) → semilla */
  }
  // 3) Semilla del bundle.
  return seed;
}

export async function writeJson(key: string, data: unknown, localPath: string): Promise<void> {
  // 1) Netlify Blobs.
  try {
    const { getStore } = await import('@netlify/blobs');
    await getStore(BLOB_STORE).setJSON(key, data);
    return;
  } catch {
    /* no estamos en Netlify o Blobs no disponible → probamos disco */
  }
  // 2) Fichero local.
  try {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(localPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    return;
  } catch {
    /* hosting de solo lectura y sin Blobs */
  }
  throw new Error(
    'Persistencia no disponible: este hosting es de solo lectura y no hay Blobs. ' +
      'Conecta Netlify Blobs o una base de datos para guardar cambios.'
  );
}
