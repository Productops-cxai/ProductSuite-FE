/** In-flight dedupe + short TTL cache so StrictMode remounts / sibling pages don't re-hit the API. */

const inflight = new Map<string, Promise<unknown>>();
const cache = new Map<string, { data: unknown; expiresAt: number }>();

const DEFAULT_TTL_MS = 30_000;

export function dedupeAsync<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = run().finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

export function cachedAsync<T>(
  key: string,
  run: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    return Promise.resolve(hit.data as T);
  }

  return dedupeAsync(key, async () => {
    const data = await run();
    cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  });
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key === prefix || key.startsWith(prefix)) cache.delete(key);
  }
}
