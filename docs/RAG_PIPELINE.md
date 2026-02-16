# RAG Pipeline

This document describes the document-to-answer pipeline used by ShaleLight.

## 1) Crawl

Implemented by `lib/jobs/crawl.ts`.

- Reads enabled crawl source path(s).
- Supports recursion, depth limits, and exclude patterns.
- Filters by configured file extensions.
- Collects file metadata including SHA-256 hash.
- Upserts file records into `file_index`.

Output: discovered/updated `file_index` rows.

## 2) Ingest

Implemented by `lib/jobs/ingest.ts`.

- Selects files in `discovered`/`queued` state.
- Enforces maximum file size guard.
- Parses file content using parser dispatch.
- Creates stable source identifier from parsed text hash.
- Inserts document and chunk rows transactionally.
- Marks file status and links file to document.
- Clears response cache after successful ingestion updates.

Output: `documents` + `chunks` rows with normalized content.

## 3) Embed

Implemented by `lib/jobs/embed.ts`.

- Loads embedding provider from settings/environment.
- Validates provider vector dimension against DB column dimension.
- Embeds unembedded chunks and writes vectors to `chunks.embedding`.

Output: vector-enriched chunks for semantic retrieval.

## 4) Entity Extraction

Implemented by `lib/jobs/entityExtract.ts`.

- Uses provider JSON output to extract entities from chunk text.
- Upserts entities and increments frequency.
- Marks chunk as processed for extraction.

Output: richer query expansion signals in `entities`.

## 5) Retrieval and Answer

Implemented by `lib/search.ts` and `app/api/chat/route.ts`.

- Performs entity expansion.
- Runs vector and lexical retrieval paths.
- Applies weighted scoring and rank fusion.
- Builds prompt context from top results.
- Streams final response with citation objects.

Output: grounded response stream with citation metadata.

## Pipeline Guarantees

- Document/chunk writes are transactional during ingest.
- Retrieval quality is bounded by parser quality, chunking quality, and embedding freshness.
- Pipeline jobs are observable through `jobs` status/progress fields.

## Operational Considerations

- Re-running crawl/ingest is expected and used for change detection.
- Embedding model changes may require DB migration for vector dimensions.
- Keep source paths restricted to intended data roots.
