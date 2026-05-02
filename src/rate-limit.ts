/**
 * Token bucket rate limiter per API key.
 * Default: 100 requests/minute per key.
 */

import { IncomingMessage, ServerResponse } from 'http';

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();
const DEFAULT_RATE = parseInt(process.env.MCP_RATE_LIMIT || '100'); // requests per minute
const REFILL_INTERVAL = 60_000; // 1 minute in ms

// Clean up stale entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * REFILL_INTERVAL;
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) {
      buckets.delete(key);
    }
  }
}, 5 * 60_000);

function getBucket(key: string): Bucket {
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: DEFAULT_RATE, lastRefill: Date.now() };
    buckets.set(key, bucket);
    return bucket;
  }

  // Refill tokens based on elapsed time
  const now = Date.now();
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= REFILL_INTERVAL) {
    const refills = Math.floor(elapsed / REFILL_INTERVAL);
    bucket.tokens = Math.min(DEFAULT_RATE, bucket.tokens + refills * DEFAULT_RATE);
    bucket.lastRefill = now;
  }

  return bucket;
}

/**
 * Check rate limit. Returns true if allowed, false if rejected (response already sent).
 */
export function checkRateLimit(key: string, res: ServerResponse): boolean {
  const bucket = getBucket(key);

  if (bucket.tokens <= 0) {
    const retryAfter = Math.ceil((REFILL_INTERVAL - (Date.now() - bucket.lastRefill)) / 1000);
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': String(Math.max(1, retryAfter)),
    });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: `Rate limit exceeded. ${DEFAULT_RATE} requests/minute allowed. Retry after ${retryAfter}s.`,
      },
      id: null,
    }));
    console.error(`[rate-limit] Key ${key.substring(0, 8)}... exceeded limit`);
    return false;
  }

  bucket.tokens--;
  return true;
}

/**
 * Get current rate limit status for a key.
 */
export function getRateLimitStatus(key: string): { remaining: number; limit: number; reset: number } {
  const bucket = getBucket(key);
  const resetMs = REFILL_INTERVAL - (Date.now() - bucket.lastRefill);
  return {
    remaining: Math.max(0, bucket.tokens),
    limit: DEFAULT_RATE,
    reset: Math.ceil(Math.max(0, resetMs) / 1000),
  };
}
