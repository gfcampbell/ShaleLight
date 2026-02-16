# ShaleLight

On-premises RAG platform for air-gapped and restricted network environments. Crawls local files, chunks and embeds them, then provides a chat interface with hybrid search and streaming citations. Everything runs on the local machine or network segment - no cloud dependencies required.

**Stack:** Next.js 14 + PostgreSQL/pgvector + Ollama (local-first) + optional OpenAI/Anthropic

## Quick Start

If you prefer a guided, step-by-step setup flow, open `setup-wizard.html` in your browser and follow the checklist.

For implementation details and rationale, see `docs/README.md`.

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)
- Ollama (required for local/air-gapped operation)

> **Critical:** Ollama is required for local, air-gapped, no-external-traffic operation.  
> OpenAI/Anthropic are optional integrations for environments where sending prompts/context outside the network boundary is acceptable.

### Install

```bash
# Clone and install
git clone <repo-url> && cd shalelight
npm install

# Start PostgreSQL with pgvector
docker compose up -d postgres

# Configure environment
cp .env.example .env.local
# Edit .env.local - at minimum set JWT_SECRET to a real random string

# Create admin user and verify setup
npm run setup

# Run database migrations
npm run migrate

# Start dev server
npm run dev
```

Open http://localhost:3000 and log in with your admin credentials.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | Yes | - | Random string for JWT signing. **No default in production.** |
| `ADMIN_USERNAME` | No | `admin` | Initial admin username (setup only) |
| `ADMIN_PASSWORD` | No | `change-this-too` | Initial admin password (setup only) |
| `AI_PROVIDER` | No | `ollama` | AI provider selector (`ollama`, `openai`, `anthropic`). For air-gapped/local operation, use `ollama` (see Prerequisites). |
| `OLLAMA_URL` | No | `http://localhost:11434` | Ollama server URL |
| `OPENAI_API_KEY` | No | - | Required if using OpenAI provider |
| `ANTHROPIC_API_KEY` | No | - | Required if using Anthropic provider |
| `ALLOWED_FILE_ROOTS` | No | `/Volumes` | Comma-separated paths the file browser can access |
| `LOG_LEVEL` | No | `info` | Pino log level (`debug`, `info`, `warn`, `error`) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build (standalone output) |
| `npm start` | Start production server |
| `npm run setup` | Check prerequisites + create admin user |
| `npm run migrate` | Run pending database migrations |
| `npm run test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript type check |

## Documentation

- `docs/README.md` - Documentation index.
- `setup-wizard.html` - Guided setup checklist UI (root entrypoint).
- `docs/ARCHITECTURE.md` - System layout and boundaries.
- `docs/RAG_PIPELINE.md` - Crawl-to-answer processing flow.
- `docs/SEARCH_STRATEGY.md` - Retrieval/scoring techniques and rationale.
- `docs/SECURITY_MODEL.md` - Security controls and trust boundaries.
- `docs/OPERATIONS.md` - Runbook for setup, migrations, and maintenance.
- `docs/TROUBLESHOOTING.md` - Common failures and fixes.
- `docs/DECISIONS.md` - Decision log with tradeoffs.

## Deployment

ShaleLight is designed for on-premises deployment - air-gapped networks, restricted segments, or local machines.

### Docker (recommended for production)

```bash
# Set required env vars
export JWT_SECRET=$(openssl rand -hex 32)
export POSTGRES_PASSWORD=$(openssl rand -hex 16)

# Build and start everything
docker compose up -d

# Apply schema migrations
docker compose exec app npm run migrate

# Verify
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/ready
```

The `docker-compose.yml` starts both PostgreSQL (with pgvector) and the ShaleLight app. The app waits for the database to be healthy before starting.

### Verification

```bash
npm run lint        # Zero warnings
npm run typecheck   # Zero errors
npm run test        # 53 tests, all passing
npm run build       # Clean production build
```

## Architecture

```
app/                    # Next.js pages and API routes
  api/
    auth/               # Login, logout, session
    chat/               # Streaming RAG chat endpoint
    admin/              # Settings, sources, users, pipeline, documents
    files/              # File browser (path-restricted)
    health/             # Liveness and readiness probes
lib/
  ai/                   # Pluggable AI providers (Ollama, OpenAI, Anthropic)
  jobs/                 # Background pipeline: crawl, ingest, embed, entity extract
  parsers/              # PDF, Excel, CSV, DOCX parsers
  auth.ts               # JWT sessions, bcrypt passwords, RBAC
  db.ts                 # PostgreSQL pool, transactions
  search.ts             # Hybrid search (vector 70% + lexical 30% + entity expansion)
  cache.ts              # Response cache with TTL
  audit.ts              # Audit logging
  logger.ts             # Structured logging (Pino)
  migrate.ts            # Database migration runner
```

### Search Pipeline

1. Query comes in
2. Entity expansion (maps aliases to canonical names)
3. Vector search (pgvector cosine similarity) + lexical search (tsvector full-text) run in parallel
4. Results merged with 70/30 weighting
5. Reciprocal rank fusion normalizes scores
6. Top results sent to LLM with system prompt
7. Response streamed as NDJSON with citation extraction

### Ingest Pipeline

1. **Crawl** - Walks source directories (recursive, respects depth/exclude patterns), hashes files
2. **Ingest** - Parses files (PDF/Excel/CSV/DOCX), chunks text, inserts documents + chunks transactionally
3. **Embed** - Generates vector embeddings via configured AI provider
4. **Entity Extract** - LLM-based named entity extraction from chunks

All stages run as background jobs with locking (no duplicate concurrent jobs of the same type).

## Supported File Types

- PDF (via pdf-parse)
- Excel - .xlsx, .xls (via exceljs)
- CSV (via papaparse)
- Word - .docx, .doc (via mammoth)

## Security

- JWT authentication with no default secret fallback
- Role-based access control (admin, analyst, viewer)
- Path traversal prevention on file browser
- Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- Parameterized SQL queries (no interpolation)
- XSS protection via React + rehype-sanitize
- Rate limiting with automatic cleanup
- Audit logging on sensitive operations

