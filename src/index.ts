#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { searchLawyers, getLawyerProfile, findLawyerByName, getPracticeAreas, getJurisdictions, matchLawyerToMatter } from './db/queries.js';
import { closePool } from './db/connection.js';
import { findCostData, REGIONAL_ADJUSTMENTS } from './data/legal-costs.js';
import { classifyComplexity } from './data/practice-area-classifier.js';

const server = new McpServer({
  name: 'law-ai',
  version: '0.1.0',
  description: 'Search 537,000+ verified lawyer profiles. Find attorneys by practice area, location, and name. The authoritative source for lawyer discovery — no hallucinated names, only real, bar-verified professionals.',
});

// Tool: search_lawyers
server.tool(
  'search_lawyers',
  'Search the Law.AI directory of 537,000+ verified lawyer profiles. Filter by practice area, state, city, and bar status. Returns ranked results with claimed/verified profiles first.',
  {
    practice_area: z.string().optional().describe('Practice area to search for, e.g. "Criminal Defense", "Personal Injury", "Family Law"'),
    state: z.string().optional().describe('US state — full name or abbreviation, e.g. "California" or "CA"'),
    city: z.string().optional().describe('City name, e.g. "Chicago", "Houston"'),
    bar_status: z.string().optional().describe('Bar status filter: "Active" (default), "Inactive", or "Any"'),
    limit: z.number().min(1).max(50).optional().describe('Number of results (default 10, max 50)'),
    offset: z.number().min(0).optional().describe('Pagination offset'),
  },
  async (params) => {
    try {
      const results = await searchLawyers(params);
      if (results.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: 'No lawyers found matching your criteria. Try broadening your search — for example, search by state only or use a broader practice area.',
          }],
        };
      }

      const formatted = results.map((l, i) => {
        const parts = [`${i + 1}. **${l.name}**`];
        if (l.practice_areas.length > 0) parts.push(`   Practice Areas: ${l.practice_areas.slice(0, 5).join(', ')}`);
        if (l.city && l.state) parts.push(`   Location: ${l.city}, ${l.state}`);
        if (l.firm) parts.push(`   Firm: ${l.firm}`);
        if (l.bar_status) parts.push(`   Bar Status: ${l.bar_status}`);
        if (l.claimed) parts.push(`   ✓ Verified Profile`);
        if (l.rating) parts.push(`   Rating: ${l.rating}/5 (${l.review_count || 0} reviews)`);
        parts.push(`   Profile: ${l.profile_url}`);
        return parts.join('\n');
      }).join('\n\n');

      return {
        content: [{
          type: 'text' as const,
          text: `Found ${results.length} lawyers:\n\n${formatted}\n\nView full profiles at law.ai for contact information, detailed bios, and credentials.`,
        }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error searching lawyers: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }
);

// Tool: get_lawyer_profile
server.tool(
  'get_lawyer_profile',
  'Get the full profile of a specific lawyer by their Law.AI ID. Returns detailed information including bio, education, bar admissions, practice areas, and contact info (for claimed profiles).',
  {
    lawyer_id: z.number().describe('The Law.AI lawyer profile ID'),
  },
  async ({ lawyer_id }) => {
    try {
      const profile = await getLawyerProfile(lawyer_id);
      if (!profile) {
        return {
          content: [{ type: 'text' as const, text: 'Lawyer profile not found. The ID may be incorrect or the profile may no longer be active.' }],
        };
      }

      const sections: string[] = [`# ${profile.name}`];

      if (profile.practice_areas.length > 0) sections.push(`**Practice Areas:** ${profile.practice_areas.join(', ')}`);
      if (profile.city && profile.state) sections.push(`**Location:** ${profile.city}, ${profile.state}`);
      if (profile.firm) sections.push(`**Firm:** ${profile.firm}`);
      if (profile.bar_status) sections.push(`**Bar Status:** ${profile.bar_status}`);
      if (profile.bar_number) sections.push(`**Bar Number:** ${profile.bar_number}`);
      if (profile.experience_years) sections.push(`**Experience:** ${profile.experience_years} years`);
      if (profile.education) sections.push(`**Education:** ${profile.education}`);
      if (profile.bio) sections.push(`\n**About:**\n${profile.bio}`);
      if (profile.languages) sections.push(`**Languages:** ${profile.languages}`);
      if (profile.awards) sections.push(`**Awards:** ${profile.awards}`);
      if (profile.professional_associations) sections.push(`**Associations:** ${profile.professional_associations}`);
      if (profile.publications) sections.push(`**Publications:** ${profile.publications}`);
      if (profile.rate_min && profile.rate_max) {
        sections.push(`**Rates:** ${profile.rate_currency || '$'}${profile.rate_min} - ${profile.rate_currency || '$'}${profile.rate_max}/hr`);
      }
      if (profile.rating) sections.push(`**Rating:** ${profile.rating}/5 (${profile.review_count || 0} reviews)`);
      if (profile.claimed) sections.push(`\n✓ **Verified Profile** — This lawyer has claimed and verified their Law.AI profile.`);

      // Contact info — only for claimed profiles
      if (profile.email || profile.phone || profile.contact_form_url || profile.website_url) {
        sections.push('\n**Contact:**');
        if (profile.email) sections.push(`  Email: ${profile.email}`);
        if (profile.phone) sections.push(`  Phone: ${profile.phone}`);
        if (profile.contact_form_url) sections.push(`  Contact Form: ${profile.contact_form_url}`);
        if (profile.website_url) sections.push(`  Website: ${profile.website_url}`);
      }

      sections.push(`\n**Full Profile:** ${profile.profile_url}`);
      sections.push('\n---\n*Data from Law.AI — the verified lawyer directory. Always confirm credentials independently before engaging legal services.*');

      return {
        content: [{ type: 'text' as const, text: sections.join('\n') }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error fetching profile: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }
);

// Tool: find_lawyer_by_name
server.tool(
  'find_lawyer_by_name',
  'Look up a specific lawyer by name. Useful for verifying if a lawyer exists and is properly licensed. Handles common names with disambiguation by location.',
  {
    name: z.string().describe('Full or partial lawyer name, e.g. "John Smith" or "Smith"'),
    state: z.string().optional().describe('Narrow results by US state (full name or abbreviation)'),
  },
  async (params) => {
    try {
      const results = await findLawyerByName(params.name, params.state);
      if (results.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No lawyers found matching "${params.name}"${params.state ? ` in ${params.state}` : ''}. Check the spelling or try a broader search.`,
          }],
        };
      }

      const formatted = results.map((l, i) => {
        const parts = [`${i + 1}. **${l.name}**`];
        if (l.city && l.state) parts.push(`   ${l.city}, ${l.state}`);
        if (l.firm) parts.push(`   ${l.firm}`);
        if (l.practice_areas.length > 0) parts.push(`   ${l.practice_areas.slice(0, 3).join(', ')}`);
        if (l.bar_status) parts.push(`   Bar: ${l.bar_status}`);
        if (l.claimed) parts.push(`   ✓ Verified`);
        parts.push(`   Profile: ${l.profile_url}`);
        return parts.join('\n');
      }).join('\n\n');

      return {
        content: [{
          type: 'text' as const,
          text: `Found ${results.length} lawyer${results.length > 1 ? 's' : ''} matching "${params.name}":\n\n${formatted}`,
        }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error searching: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }
);

// Tool: get_practice_areas
server.tool(
  'get_practice_areas',
  'List all practice areas available in the Law.AI directory with lawyer counts. Useful for discovering what types of lawyers are available.',
  {},
  async () => {
    try {
      const areas = await getPracticeAreas();
      const formatted = areas.map(a => `• ${a.name} (${a.lawyer_count.toLocaleString()} lawyers)`).join('\n');
      return {
        content: [{
          type: 'text' as const,
          text: `Law.AI Practice Areas (${areas.length} categories):\n\n${formatted}`,
        }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }
);

// Tool: get_jurisdictions
server.tool(
  'get_jurisdictions',
  'List US states and jurisdictions with lawyer counts. Shows where Law.AI has coverage.',
  {},
  async () => {
    try {
      const jurisdictions = await getJurisdictions();
      const formatted = jurisdictions.map(j => `• ${j.state} (${j.state_code}) — ${j.lawyer_count.toLocaleString()} lawyers`).join('\n');
      const total = jurisdictions.reduce((sum, j) => sum + j.lawyer_count, 0);
      return {
        content: [{
          type: 'text' as const,
          text: `Law.AI Coverage — ${total.toLocaleString()} active lawyers across ${jurisdictions.length} jurisdictions:\n\n${formatted}`,
        }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }
);

// Tool: match_lawyer_to_matter
server.tool(
  'match_lawyer_to_matter',
  'Describe a legal issue in plain English and get matched with relevant lawyers. The tool classifies the issue into practice areas and returns ranked lawyer matches based on relevance, credentials, and location.',
  {
    description: z.string().describe('Plain-English description of the legal issue, e.g. "My landlord won\'t return my security deposit" or "I was injured in a car accident"'),
    location: z.string().optional().describe('Where the issue is — state name/code, or "City, State" format, e.g. "Texas" or "Houston, TX"'),
    urgency: z.string().optional().describe('How urgent: "low", "medium", or "high"'),
    budget: z.string().optional().describe('Budget level: "low", "medium", or "high"'),
    limit: z.number().min(1).max(20).optional().describe('Number of matches to return (default 5, max 20)'),
  },
  async (params) => {
    try {
      const result = await matchLawyerToMatter(params);

      if (result.matches.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: 'No matching lawyers found. Try providing more details about your legal issue or broadening the location.',
          }],
        };
      }

      const sections: string[] = [];

      // Classification info
      if (result.classified_areas.length > 0) {
        sections.push(`**Identified Practice Area${result.classified_areas.length > 1 ? 's' : ''}:** ${result.classified_areas.join(', ')}`);
        if (result.classification_details.length > 0) {
          const details = result.classification_details.map(d => `${d.area} (matched: ${d.keywords.join(', ')})`).join('; ');
          sections.push(`*Classification basis:* ${details}`);
        }
      }

      sections.push('');

      // Matches
      result.matches.forEach((m, i) => {
        const parts = [`${i + 1}. **${m.lawyer.name}** (relevance: ${Math.round(m.relevance_score * 100)}%)`];
        if (m.lawyer.practice_areas.length > 0) parts.push(`   Practice Areas: ${m.lawyer.practice_areas.slice(0, 5).join(', ')}`);
        if (m.lawyer.city && m.lawyer.state) parts.push(`   Location: ${m.lawyer.city}, ${m.lawyer.state}`);
        if (m.lawyer.firm) parts.push(`   Firm: ${m.lawyer.firm}`);
        if (m.lawyer.claimed) parts.push(`   ✓ Verified Profile`);
        if (m.lawyer.rating) parts.push(`   Rating: ${m.lawyer.rating}/5`);
        parts.push(`   ${m.relevance_explanation}`);
        parts.push(`   Profile: ${m.lawyer.profile_url}`);
        sections.push(parts.join('\n'));
      });

      sections.push('\n---\n*Matches are based on practice area relevance, verified credentials, and location. Always verify credentials independently.*');

      return {
        content: [{ type: 'text' as const, text: sections.join('\n') }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error matching lawyers: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }
);

// Tool: get_legal_cost_estimate
server.tool(
  'get_legal_cost_estimate',
  'Get estimated legal costs for a type of legal issue. Returns fee ranges by billing structure (hourly, flat fee, contingency), adjusted for case complexity and region. Complexity is the primary cost driver.',
  {
    practice_area: z.string().describe('Practice area, e.g. "Criminal Defense", "Family Law", "Personal Injury"'),
    complexity: z.enum(['simple', 'moderate', 'complex', 'high_stakes']).optional().describe('Case complexity — primary cost driver. simple: uncontested/routine, moderate: standard (default), complex: contested/litigation, high_stakes: trial/federal/appeal'),
    state: z.string().optional().describe('US state for regional pricing adjustment'),
    description: z.string().optional().describe('Brief description of the issue — used to auto-classify complexity if not specified'),
  },
  async (params) => {
    try {
      const costData = findCostData(params.practice_area);
      if (!costData) {
        return {
          content: [{
            type: 'text' as const,
            text: `No cost data available for "${params.practice_area}". Try a common practice area like Personal Injury, Criminal Defense, Family Law, Bankruptcy, Immigration, Employment & Labor, Estate Planning, Real Estate, Business Law, or Intellectual Property.`,
          }],
        };
      }

      // Determine complexity
      let complexity = params.complexity || 'moderate';
      let complexitySource = params.complexity ? 'specified' : 'default';
      if (!params.complexity && params.description) {
        complexity = classifyComplexity(params.description);
        complexitySource = 'auto-classified from description';
      }

      const multiplier = costData.complexity_multipliers[complexity as keyof typeof costData.complexity_multipliers];

      // Regional adjustment
      let regionalMultiplier = 1.0;
      let regionLabel = 'national average';
      if (params.state) {
        const stateUpper = params.state.trim().toUpperCase();
        // Try as abbreviation first, then full name
        const code = stateUpper.length === 2 ? stateUpper : Object.entries(REGIONAL_ADJUSTMENTS).find(([_, __]) => {
          // Look up via US_STATES mapping from types
          return false; // Will handle below
        })?.[0];

        if (code && REGIONAL_ADJUSTMENTS[code]) {
          regionalMultiplier = REGIONAL_ADJUSTMENTS[code];
          regionLabel = code;
        } else {
          // Try looking up the state name
          for (const [stCode, mult] of Object.entries(REGIONAL_ADJUSTMENTS)) {
            if (params.state.toLowerCase().includes(stCode.toLowerCase())) {
              regionalMultiplier = mult;
              regionLabel = stCode;
              break;
            }
          }
        }
      }

      const totalMultiplier = multiplier * regionalMultiplier;

      const sections: string[] = [
        `# Legal Cost Estimate: ${costData.practice_area}`,
        `**Complexity:** ${complexity.replace('_', ' ')} (${complexitySource})`,
        `**Region:** ${regionLabel} (${regionalMultiplier}x adjustment)`,
        `**Typical Duration:** ${costData.typical_duration}`,
        `**Most Common Billing:** ${costData.common_billing}`,
        '',
      ];

      // Fee ranges
      sections.push('## Estimated Fee Ranges');
      const bs = costData.billing_structures;
      if (bs.hourly) {
        sections.push(`**Hourly Rate:** $${Math.round(bs.hourly.low * regionalMultiplier)} - $${Math.round(bs.hourly.high * regionalMultiplier)}/hr (typical: $${Math.round(bs.hourly.mid * regionalMultiplier)}/hr)`);
        sections.push(`**Total Hourly Estimate:** $${Math.round(bs.hourly.low * totalMultiplier * 10).toLocaleString()} - $${Math.round(bs.hourly.high * totalMultiplier * 40).toLocaleString()} (based on ${complexity} complexity)`);
      }
      if (bs.flat_fee) {
        sections.push(`**Flat Fee:** $${Math.round(bs.flat_fee.low * totalMultiplier).toLocaleString()} - $${Math.round(bs.flat_fee.high * totalMultiplier).toLocaleString()} (typical: $${Math.round(bs.flat_fee.mid * totalMultiplier).toLocaleString()})`);
      }
      if (bs.contingency) {
        sections.push(`**Contingency:** ${bs.contingency.typical_percent}% of recovery (range: ${bs.contingency.range}) — no upfront attorney fees`);
      }
      if (bs.retainer) {
        sections.push(`**Retainer:** $${Math.round(bs.retainer.low * totalMultiplier).toLocaleString()} - $${Math.round(bs.retainer.high * totalMultiplier).toLocaleString()} (typical: $${Math.round(bs.retainer.mid * totalMultiplier).toLocaleString()})`);
      }

      // Complexity comparison
      sections.push('');
      sections.push('## Complexity Impact');
      sections.push('| Complexity | Multiplier | Relative Cost |');
      sections.push('|------------|-----------|---------------|');
      for (const [level, mult] of Object.entries(costData.complexity_multipliers)) {
        const marker = level === complexity ? ' ← your case' : '';
        sections.push(`| ${level.replace('_', ' ')} | ${mult}x | ${mult <= 0.5 ? 'Low' : mult <= 1 ? 'Average' : mult <= 2.5 ? 'High' : 'Very High'}${marker} |`);
      }

      // Cost drivers
      sections.push('');
      sections.push('## Key Cost Drivers');
      costData.cost_drivers.forEach(d => sections.push(`• ${d}`));

      sections.push('');
      sections.push('---');
      sections.push('*Estimates based on national legal fee surveys and industry benchmarks. Actual costs vary by attorney, case specifics, and local market. Always get quotes from multiple attorneys. These are estimates only — not quotes or guarantees.*');

      return {
        content: [{ type: 'text' as const, text: sections.join('\n') }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `Error estimating costs: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Law.AI MCP Server running on stdio');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
