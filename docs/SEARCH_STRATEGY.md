# Search Strategy

ShaleLight uses a hybrid retrieval strategy to improve answer relevance and robustness.

## Retrieval Components

## Vector Retrieval

- Uses pgvector cosine similarity over chunk embeddings.
- Captures semantic meaning beyond exact phrase match.
- Backed by HNSW index for approximate nearest-neighbor speed.

## Lexical Retrieval

- Uses PostgreSQL full-text search (`tsvector` + query functions).
- Captures exact keyword and phrase intent.
- Backed by GIN indexes.

## Entity Expansion

- Detects known entities in user query.
- Normalizes aliases to canonical forms before lexical search.
- Helps improve recall for terms with variant forms.

## Scoring and Merge

Current merge flow:

- Vector and lexical lists are normalized independently.
- Weighted blend favors semantic signal, then lexical signal.
- Result list is rank-fused and trimmed to top-k context rows.

Rationale:

- Semantic-only retrieval can miss strict terminology.
- Lexical-only retrieval can miss paraphrased meaning.
- Weighted hybrid gives better practical grounding for mixed query styles.

## Context Assembly

- Top chunk hits are joined with document metadata.
- Prompt builder injects selected snippets into model context.
- Final answer cites chunk-derived evidence.

## Known Tradeoffs

- Embedding quality depends on selected embedding model.
- Lexical ranking quality depends on chunk granularity and text normalization.
- Entity expansion can bias toward frequent entities if overused.

## Why This Strategy

- Reliable in constrained/local deployments (database-native retrieval).
- Transparent behavior that can be tuned with SQL/index changes.
- Good balance between precision and recall for document QA workloads.
