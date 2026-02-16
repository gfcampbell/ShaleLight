# Technical Decisions and Rationale

This file records key decisions shaping ShaleLight.

## 1) Local-first AI provider default (Ollama)

Decision:

- Default provider is Ollama.

Rationale:

- Supports air-gapped and restricted deployments.
- Keeps prompt/context traffic local by default.

Tradeoff:

- Model quality/options may differ from hosted APIs.

## 2) PostgreSQL + pgvector as single system of record

Decision:

- Store operational data and embeddings in PostgreSQL.

Rationale:

- Simplifies backup/restore and operations.
- Strong query flexibility for lexical + vector retrieval.

Tradeoff:

- Tight coupling to PostgreSQL features.

## 3) Hybrid retrieval instead of single method

Decision:

- Combine vector and lexical retrieval with weighted scoring.

Rationale:

- Better recall/precision across semantic and exact-match queries.
- More robust for mixed enterprise document language.

Tradeoff:

- More tuning surface and complexity than single-path retrieval.

## 4) Background job pipeline model

Decision:

- Use staged jobs for crawl/ingest/embed/entity extraction.

Rationale:

- Separates expensive processing from request path.
- Improves observability and operational control.

Tradeoff:

- Requires lifecycle management for job reliability and cancellation semantics.

## 5) Path allowlisting for filesystem access

Decision:

- Restrict browse/discovery to configured allowed roots.

Rationale:

- Reduces accidental or malicious traversal into sensitive host paths.

Tradeoff:

- Operators must configure roots explicitly for new data locations.

## 6) Migration-driven schema updates

Decision:

- Keep schema evolution in migration files plus bootstrap init SQL.

Rationale:

- Predictable upgrade process for persistent deployments.

Tradeoff:

- Requires disciplined migration operations before running new code.
