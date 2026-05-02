"use strict";
/**
 * API key authentication for MCP HTTP transport.
 * Validates Bearer tokens from Authorization header.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateApiKey = validateApiKey;
exports.requireAuth = requireAuth;
// Load API keys from env
function getValidKeys() {
    const keys = new Set();
    const envKeys = process.env.MCP_API_KEYS || '';
    if (envKeys) {
        envKeys.split(',').map(k => k.trim()).filter(Boolean).forEach(k => keys.add(k));
    }
    const masterKey = process.env.MCP_MASTER_KEY;
    if (masterKey)
        keys.add(masterKey);
    return keys;
}
/**
 * Extract and validate API key from request.
 * Returns the key if valid, null if invalid/missing.
 */
function validateApiKey(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader)
        return null;
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match)
        return null;
    const key = match[1].trim();
    const validKeys = getValidKeys();
    // If no keys configured, allow all (development mode)
    if (validKeys.size === 0)
        return key || 'anonymous';
    if (validKeys.has(key)) {
        // Log key prefix for audit (not full key)
        const prefix = key.substring(0, 8);
        console.error(`[auth] Valid key: ${prefix}...`);
        return key;
    }
    return null;
}
/**
 * Auth middleware. Returns true if authorized, false if rejected (response already sent).
 */
function requireAuth(req, res) {
    const key = validateApiKey(req);
    if (key === null) {
        const validKeys = getValidKeys();
        if (validKeys.size === 0) {
            // No keys configured — development mode, allow through
            return 'dev-mode';
        }
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: 'Unauthorized. Provide a valid API key via Authorization: Bearer <key>',
            },
            id: null,
        }));
        console.error(`[auth] Rejected: missing or invalid key from ${req.socket.remoteAddress}`);
        return null;
    }
    return key;
}
//# sourceMappingURL=auth.js.map