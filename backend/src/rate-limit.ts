const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const hits = new Map<string, number[]>();

export function checkRateLimit(key: string): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
  if (recent.length >= MAX_REQUESTS) {
    const oldest = recent[0];
    return { ok: false, retryAfterSeconds: Math.ceil((oldest + WINDOW_MS - now) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true };
}
