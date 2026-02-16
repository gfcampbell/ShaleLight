import { describe, it, expect } from 'vitest';
import { parseFile, ParseResult } from '@/lib/parsers/index';

describe('parseFile', () => {
  it('returns correct structure shape', async () => {
    const buf = Buffer.from('hello world');
    const result = await parseFile('test.txt', buf);
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('rawText');
    expect(result).toHaveProperty('tables');
    expect(result).toHaveProperty('metadata');
  });

  it('handles plain text fallback', async () => {
    const buf = Buffer.from('Some plain text content');
    const result = await parseFile('readme.txt', buf);
    expect(result.title).toBe('readme.txt');
    expect(result.rawText).toBe('Some plain text content');
    expect(result.tables).toEqual([]);
  });

  it('parses CSV with headers into rawText with pipe-delimited rows', async () => {
    const csv = 'name,age,city\nAlice,30,NYC\nBob,25,LA';
    const buf = Buffer.from(csv);
    const result = await parseFile('data.csv', buf);
    expect(result.title).toBe('data.csv');
    expect(result.rawText).toContain('name');
    expect(result.rawText).toContain('Alice');
    expect(result.rawText).toContain('|');
    expect(result.metadata).toHaveProperty('rowCount', 3);
  });

  it('parses empty CSV without error', async () => {
    const buf = Buffer.from('');
    const result = await parseFile('empty.csv', buf);
    expect(result.title).toBe('empty.csv');
    expect(result.rawText).toBe('');
  });

  it('uses basename as title for unknown extensions', async () => {
    const buf = Buffer.from('data');
    const result = await parseFile('/path/to/file.log', buf);
    expect(result.title).toBe('file.log');
  });
});
