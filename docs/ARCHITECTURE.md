# Architecture

ShaleLight is a Next.js application with a PostgreSQL/pgvector backend and a local-first AI provider model.

## High-Level Layout

- `app/` - UI routes and API routes.
- `components/` - UI components for chat, admin, and navigation.
- `lib/ai/` - Provider implementations (Ollama, OpenAI, Anthropic) behind a shared interface.
- `lib/jobs/` - Background pipeline jobs (crawl, ingest, embed, entity extraction, cleanup, index rebuild).
- `lib/parsers/` - File parsing for PDF, Excel, CSV, and DOCX.
- `lib/` core modules:
  - `auth.ts` / `roles.ts` - session auth + RBAC checks.
  - `db.ts` / `migrate.ts` - database access and migrations.
  - `search.ts` / `rrf.ts` / `entities.ts` - retrieval logic.
  - `cache.ts` - short-lived response cache.
  - `fileDiscovery.ts` - allowed-path browsing and metadata hashing.

## Request and Data Boundaries

- **Browser -> API routes**: UI submits auth, admin, and chat requests.
- **API routes -> DB**: all persisted state uses PostgreSQL.
- **Jobs -> DB and filesystem**: crawl/ingest pipeline reads files and writes normalized records.
- **Search -> DB functions**: vector and lexical retrieval use database-side functions/indexes.
- **Chat -> AI provider**: provider adapter handles streaming and embeddings.

## Database Role

PostgreSQL stores:

- users and sessions,
- crawl sources and discovered files,
- documents and chunks,
- embeddings (pgvector),
- entities and edges,
- jobs, settings, cache, analytics, and audit logs.

This keeps state centralized and recoverable in a single operational system.

## Runtime Model

- API routes serve UI and control pipeline actions.
- Jobs are queued in-process and track progress in the `jobs` table.
- Scheduled maintenance runs through cron-based scheduler startup hooks.

## Design Intent

- Local-first operation with clear network boundary control.
- Pluggable AI provider interface without changing core app logic.
- Database-centered retrieval with explicit indexing for performance.
- Simple deployment model for restricted environments.
