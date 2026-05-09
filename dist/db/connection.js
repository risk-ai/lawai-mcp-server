"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.closePool = closePool;
const pg_1 = require("pg");
let pool = null;
function getPool() {
    if (!pool) {
        // Require environment variables - no hardcoded fallbacks
        if (!process.env.MCP_DB_PASSWORD) {
            throw new Error('MCP_DB_PASSWORD environment variable is required');
        }
        pool = new pg_1.Pool({
            host: process.env.MCP_DB_HOST || '127.0.0.1',
            port: parseInt(process.env.MCP_DB_PORT || '5433'),
            user: process.env.MCP_DB_USER || 'rich_enrichment',
            password: process.env.MCP_DB_PASSWORD,
            database: process.env.MCP_DB_NAME || 'lawai',
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });
        // Set statement timeout to 30 seconds (was 15s — too tight for cold-cache reads on 1M-row table)
        pool.on('connect', (client) => {
            client.query('SET statement_timeout = 30000');
        });
    }
    return pool;
}
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
//# sourceMappingURL=connection.js.map