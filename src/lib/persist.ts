/**
 * Persistencia JSON para los stores (rooms, bookings, invoices, expenses).
 *
 * - Netlify Blobs en producción (almacén integrado del sitio).
 * - Fichero local en disco en desarrollo / servidor Node con escritura.
 * - Semilla del bundle como último recurso (solo lectura).
 *
 * Lecturas con consistencia FUERTE para que los cambios del panel se vean al
 * instante en la web (sin la caché de la consistencia eventual). Las escrituras
 * del panel se serializan en el cliente, así que no hay escrituras concurrentes
 * sobre la misma clave.
 */
const BLOB_STORE = 'kirana';

async function getBlobStore() {
  const { getStore } = await import('@netlify/blobs');
  return getStore(BLOB_STORE);
}

/** Detecta el error "Blobs no disponible" (entorno local sin contexto Netlify). */
function isNoBlobs(err: unknown): boolean {
  const e = err as { name?: string; message?: string } | undefined;
  if (!e) return false;
  return (
    e.name === 'MissingBlobsEnvironmentError' ||
    /not been configured to use Netlify Blobs|environment has not been configured/i.test(e.message || '')
  );
}

export async function readJson<T>(key: string, seed: T, localPath: string): Promise<T> {
  // 1) Netlify Blobs (lectura FUERTE: ver siempre lo último escrito).
  try {
    const store = await getBlobStore();
    const data = (await store.get(key, { type: 'json', consistency: 'strong' })) as T | null;
    return data ?? seed;
  } catch {
    /* no estamos en Netlify o Blobs no disponible → seguimos */
  }
  // 2) Fichero local.
  try {
    const { readFileSync } = await import('node:fs');
    return JSON.parse(readFileSync(localPath, 'utf8')) as T;
  } catch {
    /* sin disco → semilla */
  }
  // 3) Semilla del bundle.
  return seed;
}

export async function writeJson(key: string, data: unknown, localPath: string): Promise<void> {
  // 1) Netlify Blobs.
  try {
    const store = await getBlobStore();
    await store.setJSON(key, data);
    return;
  } catch (err) {
    if (!isNoBlobs(err)) throw err; // error real de Blobs → propagar (no enmascarar)
  }
  // 2) Fichero local.
  try {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(localPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    return;
  } catch {
    /* solo lectura */
  }
  throw new Error(
    'Persistencia no disponible: este hosting es de solo lectura y no hay Blobs. ' +
      'Conecta Netlify Blobs o una base de datos para guardar cambios.'
  );
}

/**
 * Lee–modifica–escribe. `mutate` recibe el estado actual (o la semilla) y
 * devuelve el nuevo; puede lanzar para abortar (p. ej. fechas ocupadas).
 */
export async function updateJson<T>(
  key: string,
  seed: T,
  localPath: string,
  mutate: (current: T) => T
): Promise<T> {
  // 1) Netlify Blobs. Lectura FUERTE para no "resucitar" cambios previos
  //    (read-your-writes) al hacer lee-modifica-escribe.
  try {
    const store = await getBlobStore();
    const cur = (await store.get(key, { type: 'json', consistency: 'strong' })) as T | null;
    const next = mutate(cur ?? seed);
    await store.setJSON(key, next);
    return next;
  } catch (err) {
    if (!isNoBlobs(err)) throw err; // error real (o abort de mutate) → propagar
    // Blobs no disponible (local) → fichero
  }
  // 2) Fichero local.
  let fs: typeof import('node:fs');
  try {
    fs = await import('node:fs');
  } catch {
    throw new Error('Persistencia no disponible: este hosting es de solo lectura y no hay Blobs.');
  }
  let current: T;
  try {
    current = JSON.parse(fs.readFileSync(localPath, 'utf8')) as T;
  } catch {
    current = seed;
  }
  const next = mutate(current); // si mutate lanza (p. ej. fechas ocupadas), propaga
  try {
    fs.writeFileSync(localPath, JSON.stringify(next, null, 2) + '\n', 'utf8');
  } catch {
    throw new Error('Persistencia no disponible: este hosting es de solo lectura y no hay Blobs.');
  }
  return next;
}
