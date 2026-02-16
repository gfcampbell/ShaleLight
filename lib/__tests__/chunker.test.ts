import { describe, it, expect } from 'vitest';
import { chunkText } from '@/lib/chunker';

describe('chunkText', () => {
  it('returns empty array for empty text', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('creates a single chunk for short text', () => {
    const text = 'Hello, world!';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe(text);
    expect(chunks[0].chunk_index).toBe(0);
    expect(chunks[0].start_char).toBe(0);
  });

  it('splits long text into multiple chunks', () => {
    const text = 'A'.repeat(10000);
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('chunks have correct sequential indices', () => {
    const text = 'A'.repeat(10000);
    const chunks = chunkText(text);
    chunks.forEach((chunk, i) => {
      expect(chunk.chunk_index).toBe(i);
    });
  });

  it('detects table content', () => {
    const tableText = 'Name | Value\n---|---\nFoo | Bar\n';
    const chunks = chunkText(tableText);
    expect(chunks[0].chunk_type).toBe('table');
  });

  it('marks prose content as prose', () => {
    const proseText = 'This is a simple paragraph of text without any tables.';
    const chunks = chunkText(proseText);
    expect(chunks[0].chunk_type).toBe('prose');
  });

  it('chunks overlap correctly', () => {
    const text = 'A'.repeat(10000);
    const chunks = chunkText(text);
    if (chunks.length >= 2) {
      // Second chunk should start before first chunk ends (overlap)
      expect(chunks[1].start_char).toBeLessThan(chunks[0].end_char);
    }
  });

  it('extracts metadata with amounts', () => {
    const text = 'Revenue was $1,234,567 in Q1 2024, a 15.3% increase.';
    const chunks = chunkText(text);
    const meta = chunks[0].metadata as { amounts: string[]; percentages: string[]; dates: string[] };
    expect(meta.amounts).toContain('$1,234,567');
    expect(meta.percentages).toContain('15.3%');
    expect(meta.dates).toContain('Q1 2024');
  });
});
