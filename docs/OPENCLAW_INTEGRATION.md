ShaleLight — OpenClaw (Quinn) Integration Proposal

Overview

This document captures a prioritized plan to make ShaleLight first-class for OpenClaw (Quinn) and other programmatic agents. It lists concrete changes, rationale, implementation notes, and a combined first deliverable covering ingestion hooks, machine summaries, and agent-controlled search tuning.

Note: ShaleLight is an open-source, on-premises RAG platform focused on air-gapped and restricted network environments. Integration defaults should preserve that model: external LLM providers must be opt-in and disabled by default for community/self-hosted installs.

Goals

- Make programmatic agents first-class API clients (secure, auditable, scoped).
- Provide reliable hooks so agents can keep long-term memory (Cortex) synchronized with ShaleLight ingestion and chat output.
- Improve observability, tuning, and developer ergonomics so agents can use ShaleLight robustly in automation.
- Give agents direct control over search retrieval parameters so they can self-optimize results without human intervention.

Priority workstreams

1) Agent identity & programmatic API

- Service accounts & scoped API keys
  - Mint short-lived, scoped API tokens stored in DB with rotation metadata.
  - Roles: ingest, query, admin. Optionally: metrics, ops.
  - Endpoint: POST /api/internal/tokens (admin-only) to mint keys for agents.
  - Audit each API token action.

- Internal API surface
  - Minimal endpoints:
    - POST /api/internal/query — RAG chat endpoint returning structured JSON (answer, citations, chunk ids, scores).
    - POST /api/internal/ingest — ingest a file (URL or base64 payload) with metadata; returns job id.
    - GET /api/internal/status/:jobId — job status and result.
    - POST /api/internal/export-memory — curated export of recent/high-importance items.
  - Responses must be stable and include IDs agents can reference later.

- Agent role & RBAC
  - Create an "agent" role type; actions performed by agents should be marked in audit logs.
  - Allow per-agent policy (allowed file roots, allowed providers, quota limits).

2) Memory & event integrations (Cortex / Clawdbot)

- Webhook/event stream
  - Publish ingestion/search events: new-doc, ingest-complete, embed-complete, entity-extracted, chat-session-done.
  - Payload: stable doc id, title, excerpt, tags, vector centroid (optional), importance score.
  - Subscriber model: webhook URLs, Redis/Kafka stream, or direct push to Cortex HTTP endpoint.

- Machine-readable chat summaries
  - For each chat answer, produce a JSON summary: { title, excerpt, importance, tags, citations[], related_doc_ids[] }.
  - Make this summary available via API and optionally POST to configured webhooks.

- Session capture support
  - Add an option to persist the conversation and generated summary as a memory object with an importance score.

3) Agent-controlled search tuning

The search engine must not be a black box to the agent. Agents should have direct, per-query control over retrieval parameters so they can self-optimize for the best results.

- Per-query tuning knobs (passed in the request body)
  - vector_weight (0.0–1.0, default 0.5) — blend between vector similarity and lexical matching. Lexical weight is the complement (1 − vector_weight).
  - min_similarity (0.0–1.0, default 0.35) — minimum cosine similarity threshold; results below this are discarded.
  - top_k (1–200, default 15) — number of final results returned after fusion.
  - rrf_k (1–200, default 60) — Reciprocal Rank Fusion constant; lower values amplify top-ranked results, higher values flatten ranking.
  - entity_expansion (boolean, default true) — whether to expand the query with known entity variants.
  - max_entities (1–10, default 3) — maximum entity matches used for expansion.
  - fuzzy_threshold (0.0–1.0, default 0.3) — trigram similarity threshold for fuzzy matching.

- Current defaults (hard-coded today, to be parameterized)

  | Parameter | Default | Location |
  |-----------|---------|----------|
  | vector_weight | 0.5 | lib/search.ts:47 |
  | min_similarity | 0.35 | lib/search.ts:22 |
  | top_k | 15 | lib/search.ts:68 |
  | rrf_k | 60 | lib/rrf.ts:11 |
  | entity_expansion | true | lib/entities.ts |
  | max_entities | 3 | lib/entities.ts:40 |
  | fuzzy_threshold | 0.3 | init.sql:240 |

- Implementation approach
  - Add an optional `search_params` object to query request bodies. Missing fields fall back to defaults.
  - Thread these values through hybridSearch(), rrf(), and entity-expansion calls instead of using hard-coded constants.
  - Return the effective parameters used in every response so the agent can see exactly what settings produced the results.
  - Validate and clamp all values server-side to prevent abuse.

- Agent tuning workflow
  - Agent sends a query with default parameters.
  - Agent evaluates result quality (relevance, coverage, noise).
  - Agent adjusts knobs and re-queries — e.g., raises min_similarity to cut noise, shifts vector_weight toward lexical for keyword-heavy queries, increases top_k for broader recall.
  - Over time, the agent learns which parameter profiles work best for different query types and stores its own presets.

4) Observability & reliability

- Metrics & dashboards
  - Expose Prometheus metrics for ingestion throughput, job queue length, embedding latency, search QPS, model latencies, failure rates.
  - Grafana dashboards and alert rules for backlogs and error rates.

- Preview/dry-run ingest
  - Endpoint to preview chunking and sample embeddings without committing to DB; return predicted chunk counts and sample vectors.

5) Developer ergonomics

- SDK & CLI
  - Provide a small TypeScript + Python SDK that wraps internal API endpoints.
  - Provide a CLI: `shalelight-cli ingest --path ... --tag ... --notify-webhook=...`.

- Reproducible dev seed
  - Add sample dataset + seed script to ingest sample docs for local testing.

6) Security & safe operation

- Audit logs with searchable fields (actor, action, doc id, excerpt).
- Rate limits and quotas for agent tokens.
- Optional mTLS or IP-binding for agent keys for on-prem security.
- Explicit per-request flag to allow external LLM calls (OpenAI) — default false.

First deliverable — combined scope

The first implementation combines ingestion hooks, machine summaries, and agent-controlled search tuning into a single deliverable. This gives agents everything they need to ingest content, receive events, and tune their own retrieval quality — no black boxes.

Phase 1: Ingestion webhooks + machine summaries
- Add webhook publisher on ingestion-completion and chat-session-done events in lib/jobs.
- Payload: stable doc id, title, excerpt, tags, importance score.
- Add machine-summary generator in lib/chat: for each answer, produce { title, excerpt, importance, tags, citations[], related_doc_ids[] }.
- POST summaries to configured webhook URLs (Cortex endpoint).
- Estimated effort: 1–2 days.

Phase 2: Agent-controlled search parameters
- Refactor hybridSearch() in lib/search.ts to accept a search_params object instead of hard-coded constants.
- Thread vector_weight, min_similarity, top_k through the search pipeline.
- Thread rrf_k through lib/rrf.ts.
- Thread entity_expansion and max_entities through lib/entities.ts.
- Thread fuzzy_threshold through database function calls.
- Add search_params to the query API request body; validate and clamp values server-side.
- Return the effective parameters used in every response so the agent has full transparency.
- Estimated effort: 1–2 days.

Implementation notes & constraints

- Security first: service accounts and tokens must be auditable and revocable. Default: no public token minting without admin approval.
- Backward compatibility: keep existing public endpoints intact. All new parameters are optional with sensible defaults, so existing callers are unaffected.
- Idempotency: ingestion endpoints must accept idempotency keys so re-runs are safe.
- Opt-in external providers: default behavior must not send content to OpenAI unless explicitly permitted per-request or per-agent.
- Parameter safety: all agent-supplied search parameters are validated and clamped to safe ranges server-side. Invalid values fall back to defaults.

Open-source notes (simple)

- Defaults: For community/self-hosted installs, external providers (OpenAI/Anthropic) must be disabled by default. Document the air-gapped setup path (OLLAMA only) and include a simple security checklist before enabling external providers.
- Contribution: Keep internal API changes behind feature flags and require docs + tests for public PRs.

Next steps

1. Implement Phase 1 (webhooks + summaries).
2. Implement Phase 2 (search parameter pass-through).
3. Open a PR with tests, docs, and an example script showing how Quinn would call the APIs with custom search tuning.

Contact

Quinn (OpenClaw) — automated integration agent

Document generated: message id 5eb9f81c-11be-4e4c-8f8a-790e752143d3
