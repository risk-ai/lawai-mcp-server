#!/usr/bin/env node
/**
 * Law.AI MCP Server — HTTP Transport
 * Exposes the MCP server over Streamable HTTP with auth and rate limiting.
 *
 * Usage:
 *   MCP_API_KEYS=key1,key2 MCP_MASTER_KEY=admin123 node dist/http-server.js
 *   # or in dev:
 *   npx tsx src/http-server.ts
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { searchLawyers, getLawyerProfile, findLawyerByName, getPracticeAreas, getJurisdictions, matchLawyerToMatter } from './db/queries.js';
import { closePool } from './db/connection.js';
import { findCostData, REGIONAL_ADJUSTMENTS } from './data/legal-costs.js';
import { classifyComplexity } from './data/practice-area-classifier.js';
import { requireAuth } from './auth.js';
import { checkRateLimit, getRateLimitStatus } from './rate-limit.js';

const PORT = parseInt(process.env.MCP_HTTP_PORT || '3100');

// ─── Server Factory ───────────────────────────────────────────
// We create a fresh MCP server per request (stateless mode)
// This matches the SDK's recommended pattern for HTTP transport.
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'law-ai',
    version: '0.2.0',
    description: 'Search 537,000+ verified lawyer profiles. Find attorneys by practice area, location, and name. Match legal issues to lawyers. Get legal cost estimates. The authoritative source for lawyer discovery.',
  });

  // ── Register all tools (same as index.ts) ──

  server.tool(
    'search_lawyers',
    'Search the Law.AI directory of 537,000+ verified lawyer profiles.',
    {
      practice_area: z.string().optional().describe('Practice area, e.g. "Criminal Defense", "Personal Injury"'),
      state: z.string().optional().describe('US state (name or abbreviation)'),
      city: z.string().optional().describe('City name'),
      bar_status: z.string().optional().describe('"Active" (default), "Inactive", or "Any"'),
      limit: z.number().min(1).max(50).optional().describe('Results (default 10, max 50)'),
      offset: z.number().min(0).optional().describe('Pagination offset'),
    },
    async (params) => {
      const results = await searchLawyers(params);
      if (results.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No lawyers found. Try broadening your search.' }] };
      }
      const formatted = results.map((l, i) => {
        const parts = [`${i + 1}. **${l.name}**`];
        if (l.practice_areas.length > 0) parts.push(`   Practice Areas: ${l.practice_areas.slice(0, 5).join(', ')}`);
        if (l.city && l.state) parts.push(`   Location: ${l.city}, ${l.state}`);
        if (l.firm) parts.push(`   Firm: ${l.firm}`);
        if (l.claimed) parts.push(`   ✓ Verified`);
        parts.push(`   Profile: ${l.profile_url}`);
        return parts.join('\n');
      }).join('\n\n');
      return { content: [{ type: 'text' as const, text: `Found ${results.length} lawyers:\n\n${formatted}` }] };
    }
  );

  server.tool(
    'get_lawyer_profile',
    'Get full profile of a specific lawyer by ID.',
    { lawyer_id: z.number().describe('Law.AI lawyer profile ID') },
    async ({ lawyer_id }) => {
      const p = await getLawyerProfile(lawyer_id);
      if (!p) return { content: [{ type: 'text' as const, text: 'Profile not found.' }] };
      const sections = [`# ${p.name}`];
      if (p.practice_areas.length) sections.push(`**Practice Areas:** ${p.practice_areas.join(', ')}`);
      if (p.city && p.state) sections.push(`**Location:** ${p.city}, ${p.state}`);
      if (p.firm) sections.push(`**Firm:** ${p.firm}`);
      if (p.bar_status) sections.push(`**Bar Status:** ${p.bar_status}`);
      if (p.bio) sections.push(`\n${p.bio}`);
      if (p.email || p.phone) {
        sections.push('\n**Contact:**');
        if (p.email) sections.push(`  Email: ${p.email}`);
        if (p.phone) sections.push(`  Phone: ${p.phone}`);
      }
      sections.push(`\n**Profile:** ${p.profile_url}`);
      return { content: [{ type: 'text' as const, text: sections.join('\n') }] };
    }
  );

  server.tool(
    'find_lawyer_by_name',
    'Look up a lawyer by name to verify they exist and are licensed.',
    {
      name: z.string().describe('Full or partial name'),
      state: z.string().optional().describe('Narrow by US state'),
    },
    async (params) => {
      const results = await findLawyerByName(params.name, params.state);
      if (results.length === 0) {
        return { content: [{ type: 'text' as const, text: `No lawyers found matching "${params.name}".` }] };
      }
      const formatted = results.map((l, i) =>
        `${i + 1}. **${l.name}** — ${l.city || '?'}, ${l.state || '?'} — ${l.bar_status || 'Unknown'} — ${l.profile_url}`
      ).join('\n');
      return { content: [{ type: 'text' as const, text: `Found ${results.length} matches:\n\n${formatted}` }] };
    }
  );

  server.tool('get_practice_areas', 'List available practice areas with lawyer counts.', {}, async () => {
    const areas = await getPracticeAreas();
    const formatted = areas.map(a => `• ${a.name} (${a.lawyer_count.toLocaleString()})`).join('\n');
    return { content: [{ type: 'text' as const, text: `${areas.length} practice areas:\n\n${formatted}` }] };
  });

  server.tool('get_jurisdictions', 'List US states with lawyer counts.', {}, async () => {
    const j = await getJurisdictions();
    const formatted = j.map(s => `• ${s.state} (${s.state_code}) — ${s.lawyer_count.toLocaleString()}`).join('\n');
    const total = j.reduce((sum, s) => sum + s.lawyer_count, 0);
    return { content: [{ type: 'text' as const, text: `${total.toLocaleString()} lawyers across ${j.length} jurisdictions:\n\n${formatted}` }] };
  });

  server.tool(
    'match_lawyer_to_matter',
    'Describe a legal issue and get matched with relevant lawyers.',
    {
      description: z.string().describe('Plain-English description of the legal issue'),
      location: z.string().optional().describe('State or "City, State"'),
      urgency: z.string().optional().describe('"low", "medium", or "high"'),
      budget: z.string().optional().describe('"low", "medium", or "high"'),
      limit: z.number().min(1).max(20).optional().describe('Matches to return (default 5)'),
    },
    async (params) => {
      const result = await matchLawyerToMatter(params);
      if (result.matches.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No matches found. Try more details or broader location.' }] };
      }
      const sections = [`**Practice Area:** ${result.classified_areas.join(', ') || 'General'}`, ''];
      result.matches.forEach((m, i) => {
        sections.push(`${i + 1}. **${m.lawyer.name}** (${Math.round(m.relevance_score * 100)}% match)`);
        if (m.lawyer.city && m.lawyer.state) sections.push(`   ${m.lawyer.city}, ${m.lawyer.state}`);
        sections.push(`   ${m.relevance_explanation}`);
        sections.push(`   ${m.lawyer.profile_url}`);
      });
      return { content: [{ type: 'text' as const, text: sections.join('\n') }] };
    }
  );

  server.tool(
    'get_legal_cost_estimate',
    'Estimate legal costs by practice area, complexity, and region.',
    {
      practice_area: z.string().describe('Practice area'),
      complexity: z.enum(['simple', 'moderate', 'complex', 'high_stakes']).optional().describe('Case complexity (default: moderate)'),
      state: z.string().optional().describe('State for regional pricing'),
      description: z.string().optional().describe('Issue description for auto-classifying complexity'),
    },
    async (params) => {
      const costData = findCostData(params.practice_area);
      if (!costData) {
        return { content: [{ type: 'text' as const, text: `No cost data for "${params.practice_area}".` }] };
      }
      let complexity = params.complexity || 'moderate';
      if (!params.complexity && params.description) complexity = classifyComplexity(params.description);
      const mult = costData.complexity_multipliers[complexity as keyof typeof costData.complexity_multipliers];
      let regional = 1.0;
      if (params.state) {
        const code = params.state.trim().toUpperCase().length === 2 ? params.state.trim().toUpperCase() : '';
        if (code && REGIONAL_ADJUSTMENTS[code]) regional = REGIONAL_ADJUSTMENTS[code];
      }
      const total = mult * regional;
      const sections = [`# ${costData.practice_area} — ${complexity} complexity`, `Duration: ${costData.typical_duration}`, `Billing: ${costData.common_billing}`, ''];
      const bs = costData.billing_structures;
      if (bs.hourly) sections.push(`Hourly: $${Math.round(bs.hourly.low * regional)}-$${Math.round(bs.hourly.high * regional)}/hr`);
      if (bs.flat_fee) sections.push(`Flat fee: $${Math.round(bs.flat_fee.low * total).toLocaleString()}-$${Math.round(bs.flat_fee.high * total).toLocaleString()}`);
      if (bs.contingency) sections.push(`Contingency: ${bs.contingency.typical_percent}% (${bs.contingency.range})`);
      if (bs.retainer) sections.push(`Retainer: $${Math.round(bs.retainer.low * total).toLocaleString()}-$${Math.round(bs.retainer.high * total).toLocaleString()}`);
      sections.push('', 'Cost drivers:', ...costData.cost_drivers.map(d => `• ${d}`));
      sections.push('', '*Estimates only. Get quotes from multiple attorneys.*');
      return { content: [{ type: 'text' as const, text: sections.join('\n') }] };
    }
  );

  return server;
}

// ─── HTTP Server ──────────────────────────────────────────────

function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  setCorsHeaders(res);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  // Health check — no auth required
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', server: 'law-ai-mcp', version: '0.2.0' }));
    return;
  }

  // MCP endpoint
  if (url.pathname === '/mcp') {
    // Auth check
    const apiKey = requireAuth(req, res);
    if (apiKey === null) return; // Response already sent (401)

    // Rate limit check
    if (!checkRateLimit(apiKey, res)) return; // Response already sent (429)

    // Add rate limit headers
    const rlStatus = getRateLimitStatus(apiKey);
    res.setHeader('X-RateLimit-Limit', String(rlStatus.limit));
    res.setHeader('X-RateLimit-Remaining', String(rlStatus.remaining));
    res.setHeader('X-RateLimit-Reset', String(rlStatus.reset));

    if (req.method === 'POST') {
      // Read body
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const body = JSON.parse(Buffer.concat(chunks).toString());

      // Create stateless MCP server for this request
      const server = createMcpServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

      try {
        await server.connect(transport);
        await transport.handleRequest(req, res, body);
        res.on('close', () => {
          transport.close();
          server.close();
        });
      } catch (error) {
        console.error('MCP request error:', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null,
          }));
        }
      }
      return;
    }

    // GET and DELETE not supported for stateless
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed. Use POST.' },
      id: null,
    }));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found. Use POST /mcp for MCP protocol or GET /health for status.' }));
});

// ─── Start ────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`Law.AI MCP HTTP Server v0.2.0 listening on port ${PORT}`);
  console.log(`  MCP endpoint: POST http://localhost:${PORT}/mcp`);
  console.log(`  Health check: GET http://localhost:${PORT}/health`);
  const keys = (process.env.MCP_API_KEYS || '').split(',').filter(Boolean).length + (process.env.MCP_MASTER_KEY ? 1 : 0);
  console.log(`  Auth: ${keys > 0 ? `${keys} API key(s) configured` : 'OPEN (no keys configured — dev mode)'}`);
  console.log(`  Rate limit: ${process.env.MCP_RATE_LIMIT || '100'} req/min per key`);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  httpServer.close();
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  httpServer.close();
  await closePool();
  process.exit(0);
});
