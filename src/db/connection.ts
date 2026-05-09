import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    // Require environment variables - no hardcoded fallbacks
    if (!process.env.MCP_DB_PASSWORD) {
      throw new Error('MCP_DB_PASSWORD environment variable is required');
    }
    
    pool = new Pool({
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

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
