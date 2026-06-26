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

/** Detecta el error "Blobs no disponible" (entorno local sin contexto Netlify). */
function isNoBlobs(err: unknown): boolean {
  const e = err as { name?: string; message?: string } | undefined;
  if (!e) return false;
  return (
    e.name === 'MissingBlobsEnvironmentError' ||
    /not been configured to use Netlify Blobs|environment has not been configured/i.test(e.message || '')
  );
}

/**
 * Lee–modifica–escribe con concurrencia segura. En Netlify Blobs usa etag
 * (onlyIfMatch) y reintenta si otro proceso escribió en medio, evitando perder
 * cambios (p. ej. activar varias habitaciones seguidas). En local cae a fichero.
 * `mutate` recibe el estado actual (o la semilla) y devuelve el nuevo; puede
 * lanzar para abortar (p. ej. fechas ocupadas).
 */
export async function updateJson<T>(
  key: string,
  seed: T,
  localPath: string,
  mutate: (current: T) => T
): Promise<T> {
  // 1) Netlify Blobs con concurrencia optimista (etag + reintentos).
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore(BLOB_STORE);
    for (let i = 0; i < 8; i++) {
      const res = (await store.getWithMetadata(key, { type: 'json' })) as { data: T; etag: string } | null;
      const base = res && res.data != null ? res.data : seed;
      const next = mutate(base);
      const opts = res && res.etag ? { onlyIfMatch: res.etag } : { onlyIfNew: true };
      const w = (await store.setJSON(key, next, opts)) as { modified?: boolean } | undefined;
      if (!w || w.modified !== false) return next; // escrito con éxito
      // conflicto: otro escribió entre el read y el write → reintentar con lo último
    }
    throw new Error('No se pudo guardar: demasiados cambios simultáneos, inténtalo de nuevo.');
  } catch (err) {
    if (!isNoBlobs(err)) throw err; // error real (conflicto/abort de mutate) → propagar
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
