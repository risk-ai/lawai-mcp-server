# Law.AI MCP Server — Project Specification

**Project Owner:** Luke (Chief of Staff)
**Lead Developer:** Devin
**Status:** 🟢 Active — Initiated 2026-04-25
**Priority:** P0 — Strategic initiative, first-mover advantage

---

## Vision

Make Law.AI the canonical lawyer discovery source for every AI assistant in the world. When any AI agent needs to find, verify, or connect someone with a lawyer, it queries Law.AI via MCP.

## Strategic Value

- **First mover:** No legal directory has an MCP server. Not FindLaw, Avvo, LegalZoom, Martindale, or Justia.
- **Moat:** Network effects compound — every integration makes us harder to displace.
- **Solves real problem:** LLMs hallucinate lawyer names. We provide grounded, verified data.
- **Revenue driver:** Free search drives adoption → paid matter submission/lead routing drives revenue.

---

## Architecture

### Tech Stack
- **Language:** TypeScript
- **Framework:** `@modelcontextprotocol/sdk`
- **Transport:** Stdio (local) + Streamable HTTP (remote)
- **Database:** Existing Cloud SQL (PostgreSQL) via connection pool
- **Deployment:** Standalone server, publishable to npm
- **Auth:** API key-based for remote transport; open for stdio

### Database Connection
- **Production:** Cloud SQL `smooth-era-469917-b2:us-central1:law-ai-db`
- **Local dev:** Proxy at `127.0.0.1:5433`
- **Schema:** `lawai` (NOT `public`)
- **Primary table:** `lawai.lawyers` (537K+ profiles)
- **Key columns:** `id`, `first_name`, `last_name`, `practice_areas`, `state`, `city`, `bar_number`, `bar_status`, `firm`, `website_url`, `email`, `phone`, `bio`, `claimed`, `email_confidence`

### Project Location
```
/home/aiv/.openclaw/workspace/projects/mcp-server/
├── PROJECT.md          # This file
├── src/
│   ├── index.ts        # Entry point, server setup
│   ├── tools/          # MCP tool definitions
│   │   ├── search-lawyers.ts
│   │   ├── get-lawyer-profile.ts
│   │   ├── find-lawyer-by-name.ts
│   │   ├── match-lawyer-to-matter.ts
│   │   ├── get-practice-areas.ts
│   │   └── get-jurisdictions.ts
│   ├── db/
│   │   ├── connection.ts    # PostgreSQL connection pool
│   │   └── queries.ts       # SQL query builders
│   ├── utils/
│   │   ├── sanitize.ts      # Input sanitization
│   │   └── rate-limit.ts    # Rate limiting logic
│   └── types/
│       └── index.ts         # TypeScript interfaces
├── package.json
├── tsconfig.json
├── README.md           # Public-facing documentation
├── LICENSE             # MIT
└── tests/
    └── tools.test.ts
```

---

## Phase 1: Core MCP Server (Target: 1-2 days)

### Tools to Implement

#### 1. `search_lawyers`
Search the Law.AI directory by criteria.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| practice_area | string | No | e.g., "Criminal Defense", "Personal Injury" |
| state | string | No | US state (full name or abbreviation) |
| city | string | No | City name |
| bar_status | string | No | "Active" (default), "Inactive", "Any" |
| limit | number | No | Results to return (default 10, max 50) |
| offset | number | No | Pagination offset |

**Returns:** Array of lawyer summaries (name, practice areas, location, firm, profile URL)

#### 2. `get_lawyer_profile`
Get full profile details for a specific lawyer.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| lawyer_id | string | Yes | Law.AI profile ID |

**Returns:** Full profile (name, bar info, practice areas, bio, location, firm, contact info for claimed profiles, profile URL)

#### 3. `find_lawyer_by_name`
Look up a specific lawyer by name.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Full or partial name |
| state | string | No | Narrow by state |

**Returns:** Matching profiles (handles common names with disambiguation)

#### 4. `get_practice_areas`
List all available practice areas for discovery.

**Returns:** Array of practice area names with lawyer counts

#### 5. `get_jurisdictions`
List available states/jurisdictions.

**Returns:** Array of states with lawyer counts

### Phase 1 Deliverables
- [ ] Working MCP server with all 5 tools
- [ ] Stdio transport (works with Claude Desktop, Cursor, etc.)
- [ ] Local testing against Cloud SQL proxy
- [ ] Unit tests for each tool
- [ ] README with setup instructions
- [ ] package.json ready for npm publish

---

## Phase 2: Smart Matching (Target: Days 2-4)

#### 6. `match_lawyer_to_matter`
Consumer describes their legal issue → ranked lawyer matches.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| description | string | Yes | Plain-English description of legal issue |
| location | string | No | Where the issue is (state/city) |
| urgency | string | No | "low", "medium", "high" |
| budget | string | No | "low", "medium", "high" |
| limit | number | No | Number of matches (default 5) |

**Logic:**
1. Classify description → practice area(s) using keyword/pattern matching (no external LLM dependency)
2. Filter by location if provided
3. Rank by: claimed profile (boost), has bio (boost), has email (boost), bar_status = Active
4. Return ranked matches with relevance explanation

#### 7. `get_legal_cost_estimate`
Aggregate fee expectations by practice area, region, and case complexity.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| practice_area | string | Yes | Practice area (e.g., "Criminal Defense", "Family Law") |
| complexity | string | No | Case complexity — primary cost driver. One of: "simple", "moderate", "complex", "high_stakes". Default: "moderate" |
| state | string | No | State for regional pricing adjustments |
| description | string | No | Brief description of the legal issue for better complexity inference |

**Complexity Levels:**
| Level | Meaning | Example (Family Law) | Example (Criminal Defense) |
|-------|---------|---------------------|---------------------------|
| simple | Uncontested, minimal negotiation | Uncontested divorce, no kids/assets | First-offense misdemeanor, plea deal likely |
| moderate | Some contested issues, standard process | Divorce with custody negotiation | DUI with prior, contested charges |
| complex | Multiple contested issues, litigation likely | High-asset divorce, custody dispute | Felony defense, multiple charges |
| high_stakes | Exceptional complexity, trial/appeal likely | International custody, business valuation | Federal charges, jury trial, appeals |

**Returns:** 
- Fee ranges per billing structure (hourly/flat/contingency) adjusted by complexity
- Typical case duration range
- Key cost drivers and factors that can increase/decrease cost
- Common billing structure for that practice area + complexity combo
- Regional adjustments (metro premium, cost-of-living factors)

**Logic:**
1. Look up base fee data for practice_area (curated reference table)
2. Apply complexity multiplier (simple: 0.4x, moderate: 1x, complex: 2x, high_stakes: 4x)
3. Apply regional adjustment if state provided (NY/CA metro premium ~1.3x, rural discount ~0.7x)
4. If description provided but no complexity, auto-classify complexity from keywords
5. Return structured estimate with confidence level and disclaimers

### Phase 2 Deliverables
- [ ] Matter matching with practice area classification
- [ ] Cost estimation tool
- [ ] Streamable HTTP transport (remote access)
- [ ] API key authentication for remote transport
- [ ] Rate limiting (100 req/min free tier)
- [ ] Published to npm as `@lawai/mcp-server`

---

## Phase 3: Transactional (Target: Days 4-7)

#### 8. `submit_matter`
Submit a legal matter to matched lawyers.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| description | string | Yes | Matter description |
| contact_name | string | Yes | Consumer's name |
| contact_email | string | Yes | Consumer's email |
| contact_phone | string | No | Consumer's phone |
| practice_area | string | Yes | Identified practice area |
| state | string | Yes | Jurisdiction |
| lawyer_ids | string[] | No | Specific lawyers to contact (or auto-match) |

**Logic:**
1. Creates matter in `lawai.matters` table
2. Matches to lawyers if `lawyer_ids` not specified
3. Creates `matter_contacts` records
4. Triggers notification to matched lawyers (email if claimed)
5. Returns matter ID and confirmation

#### 9. `check_lawyer_availability`
Check if a claimed lawyer is accepting new clients.

### Phase 3 Deliverables
- [ ] Matter submission flow
- [ ] Lawyer notification pipeline
- [ ] Consultation scheduling (if lawyer has calendar integration)
- [ ] Usage analytics/tracking
- [ ] Deployed to production (Vercel Edge or standalone)

---

## Phase 4: Distribution & Marketing (Begins in parallel with Phase 2)

### Publishing Targets
1. **npm** — `@lawai/mcp-server` (primary distribution)
2. **Anthropic MCP Directory** — Official Claude integration listing
3. **GitHub** — Open source under MIT license at `law-ai/mcp-server`
4. **Smithery.ai** — MCP server registry
5. **mcp.run** — MCP server marketplace
6. **Glama** — MCP directory
7. **Claude Desktop config** — Documentation for one-click setup
8. **Cursor / Windsurf / VS Code** — Integration guides

### Marketing Assets
- [ ] README.md (doubles as landing page content)
- [ ] Blog post: "Stop Hallucinating Lawyers — Introducing the Law.AI MCP Server"
- [ ] Press release for legal tech publications (ABA Journal, Law.com, Artificial Lawyer)
- [ ] Demo video showing Claude + Law.AI MCP in action
- [ ] Twitter/X announcement thread from @lawai account
- [ ] Hacker News / Reddit /r/LocalLLaMA / /r/ClaudeAI posts
- [ ] Product Hunt launch

### PR Targets
- ABA Journal
- Law.com / The American Lawyer
- Artificial Lawyer
- TechCrunch (AI beat)
- The Verge
- Ars Technica
- Legal Tech News
- Above the Law

---

## Data Privacy & Security Rules

1. **Never expose email/phone for unclaimed profiles** — only for lawyers who have claimed their profile and opted in to contact
2. **Rate limit all endpoints** — prevent scraping
3. **No PII in logs** — sanitize before logging
4. **API keys required for remote transport** — free tier with limits
5. **Respect bar_status** — clearly indicate inactive/suspended lawyers
6. **Include disclaimers** — "This is a directory, not a referral service. Verify credentials independently."

---

## Success Metrics

| Metric | 30-Day Target | 90-Day Target |
|--------|--------------|---------------|
| npm weekly downloads | 100 | 1,000 |
| API keys issued | 50 | 500 |
| Queries/day | 500 | 10,000 |
| Matters submitted via MCP | 10 | 200 |
| MCP directory listings | 3 | 6 |
| Press mentions | 2 | 5 |

---

## Dependencies

- Cloud SQL proxy running (or production connection string for deployed version)
- `@modelcontextprotocol/sdk` (latest)
- `pg` (PostgreSQL client)
- npm org `@lawai` (need to register or use `lawai-mcp-server`)

## Notes

- Keep the server lightweight — no external LLM dependencies for core tools
- Matter matching in Phase 2 uses rule-based classification, not LLM inference
- Open source from day one — MIT license for maximum adoption
- Privacy first — only expose what lawyers have consented to share
