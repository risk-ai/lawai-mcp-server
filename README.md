# Law.AI MCP Server

> Find real, verified lawyers through any AI assistant. No hallucinations, just facts.

The Law.AI MCP Server gives AI assistants direct access to **537,000+ verified lawyer profiles** across all 50 US states. When an AI needs to find, verify, or recommend a lawyer, it queries Law.AI instead of guessing.

## Why This Exists

Every major AI model fabricates lawyer names when asked for legal referrals. This is dangerous — people making critical legal decisions get fake information. The Law.AI MCP Server solves this by providing a grounded, authoritative data source that any AI can query.

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "law-ai": {
      "command": "npx",
      "args": ["lawai-mcp-server"]
    }
  }
}
```

### Remote (HTTP Transport)

Connect to the hosted endpoint:

```
https://mcp.law.ai/mcp
```

### Cursor / VS Code

Add to your MCP settings:

```json
{
  "law-ai": {
    "command": "npx",
    "args": ["lawai-mcp-server"]
  }
}
```

### From Source

```bash
git clone https://github.com/risk-ai/lawai-mcp-server.git
cd lawai-mcp-server
npm install
npm run build
npm start
```

## Available Tools

### `search_lawyers`
Search the directory by practice area, location, and bar status.

```
"Find personal injury lawyers in Houston, Texas"
→ Returns ranked results with profiles, firms, and credentials
```

### `get_lawyer_profile`
Get full details for a specific lawyer by ID.

```
"Get profile for lawyer #12345"
→ Returns bio, education, bar admissions, practice areas, contact info
```

### `find_lawyer_by_name`
Look up a lawyer by name to verify they exist and are licensed.

```
"Is there a lawyer named Jane Smith in New York?"
→ Returns matching profiles with disambiguation
```

### `get_practice_areas`
List all available practice areas with lawyer counts.

### `get_jurisdictions`
List US states and territories with coverage numbers.

## Data Privacy

- **Unclaimed profiles**: Public bar information only (name, location, practice areas, bar status)
- **Claimed profiles**: Additional contact information the lawyer has opted to share
- **No scraping**: Rate-limited to prevent data harvesting
- **Disclaimers included**: All results note that credentials should be independently verified

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `127.0.0.1` | PostgreSQL host |
| `DB_PORT` | `5433` | PostgreSQL port |
| `DB_USER` | `rich_enrichment` | Database user |
| `DB_PASSWORD` | — | Database password |
| `DB_NAME` | `lawai` | Database name |
| `LAW_AI_BASE_URL` | `https://law.ai` | Base URL for profile links |

## How It Works

```
User: "Find me a patent attorney in San Francisco"
  ↓
AI Assistant (Claude, GPT, etc.)
  ↓
MCP Protocol
  ↓
Law.AI MCP Server
  ↓
537K+ verified lawyer profiles (PostgreSQL)
  ↓
Real attorneys with real bar numbers
```

## Coverage

- **537,000+** lawyer profiles
- **454,000+** active lawyers
- **All 50 states** + DC
- **90+** practice areas
- **92,000+** with verified email addresses
- Data sourced from state bar associations, court records, and public filings

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT — use it everywhere.

## About Law.AI

[Law.AI](https://law.ai) is the independent lawyer directory built for the AI age. While legacy directories (FindLaw, Avvo, Martindale) were built for web search, Law.AI is built for AI-native discovery.

---

*Stop hallucinating lawyers. Start finding real ones.*
