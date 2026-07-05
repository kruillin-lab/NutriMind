import { LRUCache } from "lru-cache";

// Sliding-window rate limiter backed by in-process memory.
//
// NOTE: This is best-effort on serverless platforms — each instance keeps its
// own counters, so the effective limit is per-instance, not global. It still
// damps abuse and accidental client loops without external infrastructure.

const MAX_TRACKED_KEYS = 5000;

const requestLog = new LRUCache<string, number[]>({
  max: MAX_TRACKED_KEYS,
});

/**
 * Returns true if the request identified by `key` is allowed, false if the
 * caller has exceeded `limit` requests within the trailing `windowMs` window.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (requestLog.get(key) ?? []).filter((ts) => now - ts < windowMs);

  if (recent.length >= limit) {
    requestLog.set(key, recent);
    return false;
  }

  requestLog.set(key, [...recent, now]);
  return true;
}
