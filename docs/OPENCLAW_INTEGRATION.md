ShaleLight — OpenClaw (Quinn) Integration Proposal

Overview

This document captures a prioritized plan to make ShaleLight first-class for OpenClaw (Quinn) and other programmatic agents. It lists concrete changes, rationale, implementation notes, and a proposed short-term roadmap with two high-leverage first tasks.

Note: ShaleLight is an open-source, on-premises RAG platform focused on air-gapped and restricted network environments. Integration defaults should preserve that model: external LLM providers must be opt-in and disabled by default for community/self-hosted installs.

Goals

- Make programmatic agents first-class API clients (secure, auditable, scoped).
- Provide reliable hooks so agents can keep long-term memory (Cortex) synchronized with ShaleLight ingestion and chat output.
- Improve observability, tuning, and developer ergonomics so agents can use ShaleLight robustly in automation.

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

3) Observability, tuning & reliability

- Metrics & dashboards
  - Expose Prometheus metrics for ingestion throughput, job queue length, embedding latency, search QPS, model latencies, failure rates.
  - Grafana dashboards and alert rules for backlogs and error rates.

- Admin tuning knobs
  - Expose search weighting (vector/lexical), fusion parameters, and entity-expansion toggles in the admin UI and via API.

- Preview/dry-run ingest
  - Endpoint to preview chunking and sample embeddings without committing to DB; return predicted chunk counts and sample vectors.

4) Developer ergonomics

- SDK & CLI
  - Provide a small TypeScript + Python SDK that wraps internal API endpoints.
  - Provide a CLI: `shalelight-cli ingest --path ... --tag ... --notify-webhook=...`.

- Reproducible dev seed
  - Add sample dataset + seed script to ingest sample docs for local testing.

5) Security & safe operation

- Audit logs with searchable fields (actor, action, doc id, excerpt).
- Rate limits and quotas for agent tokens.
- Optional mTLS or IP-binding for agent keys for on-prem security.
- Explicit per-request flag to allow external LLM calls (OpenAI) — default false.

Short-term, high-leverage items (pick 2)

A. Internal query API + TypeScript SDK
- Benefits: Instant programmatic access for agents. Quick win.
- Implementation: Add /api/internal/query that mirrors the chat endpoint but returns structured JSON (no streaming). Implement a minimal SDK (TS) that signs requests with agent API key.
- Estimated effort: 1–2 days.

B. Ingestion webhook + machine summary generator
- Benefits: Allows Cortex/Clawdbot to receive memories automatically when documents are ingested or when chats finish.
- Implementation: Add webhook publisher in lib/jobs ingestion completion, and add a machine-summary generator in lib/chat that returns structured metadata alongside chat output.
- Estimated effort: 1–2 days.

Implementation notes & constraints

- Security first: service accounts and tokens must be auditable and revocable. Default: no public token minting without admin approval.
- Backward compatibility: keep existing public endpoints intact. The internal API should be additive and behind role checks.
- Idempotency: ingestion endpoints must accept idempotency keys so re-runs are safe.
- Opt-in external providers: default behavior must not send content to OpenAI unless explicitly permitted per-request or per-agent.

Open-source notes (simple)

- Defaults: For community/self-hosted installs, external providers (OpenAI/Anthropic) must be disabled by default. Document the air-gapped setup path (OLLAMA only) and include a simple security checklist before enabling external providers.
- Contribution: Keep internal API changes behind feature flags and require docs + tests for public PRs.

Next steps

1. Confirm which two short-term items to prioritize (A or B). 2. I can implement the selected items and open a PR with tests, docs, and a small example script showing how Quinn would call the APIs.

Contact

Quinn (OpenClaw) — automated integration agent

Document generated: message id 5eb9f81c-11be-4e4c-8f8a-790e752143d3
