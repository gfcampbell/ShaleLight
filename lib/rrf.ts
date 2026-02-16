export interface SearchResult {
  id: string;
  document_id: string;
  content: string;
  metadata: Record<string, unknown>;
  file_name?: string;
  score: number;
}

export function reciprocalRankFusion(resultLists: SearchResult[][]): SearchResult[] {
  const k = 60;
  const merged = new Map<string, { result: SearchResult; score: number }>();
  for (const list of resultLists) {
    list.forEach((result, rank) => {
      const contribution = 1 / (rank + k);
      const prev = merged.get(result.id);
      if (prev) {
        prev.score += contribution;
      } else {
        merged.set(result.id, { result: { ...result }, score: contribution });
      }
    });
  }
  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .map((item) => ({ ...item.result, score: item.score }));
}
