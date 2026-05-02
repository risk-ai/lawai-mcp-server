/**
 * Token bucket rate limiter per API key.
 * Default: 100 requests/minute per key.
 */
import { ServerResponse } from 'http';
/**
 * Check rate limit. Returns true if allowed, false if rejected (response already sent).
 */
export declare function checkRateLimit(key: string, res: ServerResponse): boolean;
/**
 * Get current rate limit status for a key.
 */
export declare function getRateLimitStatus(key: string): {
    remaining: number;
    limit: number;
    reset: number;
};
