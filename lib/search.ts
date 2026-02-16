import { dbQuery } from '@/lib/db';
import { reciprocalRankFusion, SearchResult } from '@/lib/rrf';
import { getEmbeddingProvider } from '@/lib/ai';
import { applyEntityExpansions, detectEntityExpansions } from '@/lib/entities';

interface VectorResult {
  id: string;
  document_id: string;
  content: string;
  metadata: Record<string, unknown>;
  vector_score: number;
}

interface LexicalResult {
  id: string;
  document_id: string;
  content: string;
  metadata: Record<string, unknown>;
  lexical_score: number;
}

const MIN_VECTOR_SIMILARITY = 0.35;

async function vectorSearch(embedding: number[], limit = 50): Promise<VectorResult[]> {
  const rows = await dbQuery<VectorResult>(
    `SELECT * FROM vector_search($1::vector, $2)`,
    [`[${embedding.join(',')}]`, limit]
  );
  return rows.filter((r) => r.vector_score >= MIN_VECTOR_SIMILARITY);
}

async function lexicalSearch(query: string, limit = 50): Promise<LexicalResult[]> {
  return dbQuery<LexicalResult>(`SELECT * FROM lexical_search($1, $2)`, [query, limit]);
}

function hybridScore(vector: VectorResult[], lexical: LexicalResult[]): SearchResult[] {
  const map = new Map<string, SearchResult>();
  const maxVector = Math.max(...vector.map((v) => v.vector_score), 1);
  const maxLex = Math.max(...lexical.map((v) => v.lexical_score), 1);

  for (const item of vector) {
    map.set(item.id, {
      id: item.id,
      document_id: item.document_id,
      content: item.content,
      metadata: item.metadata,
      score: (item.vector_score / maxVector) * 0.5,
    });
  }
  for (const item of lexical) {
    const score = (item.lexical_score / maxLex) * 0.5;
    const prev = map.get(item.id);
    if (prev) {
      prev.score += score;
    } else {
      map.set(item.id, {
        id: item.id,
        document_id: item.document_id,
        content: item.content,
        metadata: item.metadata,
        score,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}

export async function hybridSearch(query: string, topK = 15): Promise<SearchResult[]> {
  const provider = await getEmbeddingProvider();
  const entityMap = await detectEntityExpansions(query);
  const expanded = applyEntityExpansions(query, entityMap);
  const embedding = await provider.embedText(query);

  const [vectorResults, lexicalResults] = await Promise.all([
    vectorSearch(embedding, 80),
    lexicalSearch(expanded, 80),
  ]);

  const merged = reciprocalRankFusion([hybridScore(vectorResults, lexicalResults)]);
  const top = merged.slice(0, topK);
  const docIds = [...new Set(top.map((r) => r.document_id))];
  if (docIds.length === 0) return top;

  const docs = await dbQuery<{ id: string; file_name: string; title: string }>(
    `SELECT id, file_name, title FROM documents WHERE id = ANY($1::uuid[])`,
    [docIds]
  );
  const docMap = new Map(docs.map((d) => [d.id, d]));
  return top.map((r) => ({
    ...r,
    file_name: docMap.get(r.document_id)?.file_name || docMap.get(r.document_id)?.title || r.document_id,
  }));
}
