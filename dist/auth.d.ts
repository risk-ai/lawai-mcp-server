/**
 * API key authentication for MCP HTTP transport.
 * Validates Bearer tokens from Authorization header.
 */
import { IncomingMessage, ServerResponse } from 'http';
/**
 * Extract and validate API key from request.
 * Returns the key if valid, null if invalid/missing.
 */
export declare function validateApiKey(req: IncomingMessage): string | null;
/**
 * Auth middleware. Returns true if authorized, false if rejected (response already sent).
 */
export declare function requireAuth(req: IncomingMessage, res: ServerResponse): string | null;
