import { describe, it, expect } from 'vitest';
import { reciprocalRankFusion, SearchResult } from '@/lib/rrf';

describe('reciprocalRankFusion', () => {
  function makeResult(id: string, score: number): SearchResult {
    return { id, document_id: `doc-${id}`, content: `Content for ${id}`, metadata: {}, score };
  }

  it('returns empty array for empty input', () => {
    expect(reciprocalRankFusion([])).toEqual([]);
  });

  it('returns single list unchanged in order', () => {
    const list = [makeResult('a', 0.9), makeResult('b', 0.7)];
    const result = reciprocalRankFusion([list]);
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });

  it('merges results from multiple lists', () => {
    const list1 = [makeResult('a', 0.9), makeResult('b', 0.7)];
    const list2 = [makeResult('b', 0.8), makeResult('c', 0.6)];
    const result = reciprocalRankFusion([list1, list2]);

    // 'b' appears in both lists so should get boosted
    const ids = result.map((r) => r.id);
    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(ids).toContain('c');
  });

  it('boosts items appearing in multiple lists', () => {
    const list1 = [makeResult('a', 0.9), makeResult('b', 0.7)];
    const list2 = [makeResult('b', 0.8), makeResult('c', 0.6)];
    const result = reciprocalRankFusion([list1, list2]);

    const bResult = result.find((r) => r.id === 'b')!;
    const cResult = result.find((r) => r.id === 'c')!;
    // b appears in both lists so its RRF score should be higher
    expect(bResult.score).toBeGreaterThan(cResult.score);
  });
});
