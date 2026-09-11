type Entry<T> = { expiresAt: number; value: Promise<T> };
const globalCache = globalThis as typeof globalThis & { __neurocityPublicCache?: Map<string, Entry<unknown>> };
const cache = globalCache.__neurocityPublicCache ??= new Map<string, Entry<unknown>>();

export async function cachedPublicData<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const current = cache.get(key) as Entry<T> | undefined;
  if (current && current.expiresAt > now) return current.value;
  if (current) cache.delete(key);
  if (cache.size > 250) for (const [entryKey, entry] of cache) if (entry.expiresAt <= now) cache.delete(entryKey);
  const value = load().catch((error) => { cache.delete(key); throw error; });
  cache.set(key, { expiresAt: now + ttlSeconds * 1000, value });
  return value;
}

export function invalidatePublicCache(prefix?: string) {
  if (!prefix) return cache.clear();
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}

export const publicCacheHeaders = (edgeSeconds: number, staleSeconds = edgeSeconds * 5) => ({
  "cache-control": `public, max-age=10, s-maxage=${edgeSeconds}, stale-while-revalidate=${staleSeconds}`,
  vary: "Host",
});
