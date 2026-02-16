import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserMessage, Chunk } from '@/lib/prompt';

describe('buildSystemPrompt', () => {
  it('returns default prompt when no argument given', () => {
    const result = buildSystemPrompt();
    expect(result).toContain('document research assistant');
    expect(result).toContain('Cite factual claims');
  });

  it('returns custom string when provided', () => {
    expect(buildSystemPrompt('Custom instructions')).toBe('Custom instructions');
  });
});

describe('buildUserMessage', () => {
  function makeChunk(overrides: Partial<Chunk> = {}): Chunk {
    return {
      id: 'chunk-1',
      document_id: 'doc-1',
      content: 'Test content',
      metadata: {},
      ...overrides,
    };
  }

  it('formats query and chunks as XML', () => {
    const result = buildUserMessage('my query', [makeChunk()]);
    expect(result).toContain('<search_query>my query</search_query>');
    expect(result).toContain('<content>Test content</content>');
  });

  it('escapes XML special characters', () => {
    const chunk = makeChunk({ content: 'a < b & c > d "e" \'f\'' });
    const result = buildUserMessage('q <>&', [chunk]);
    expect(result).toContain('q &lt;&gt;&amp;');
    expect(result).toContain('a &lt; b &amp; c &gt; d &quot;e&quot; &apos;f&apos;');
  });

  it('numbers results starting at 1', () => {
    const chunks = [makeChunk({ id: 'a' }), makeChunk({ id: 'b' })];
    const result = buildUserMessage('q', chunks);
    expect(result).toContain('index="1"');
    expect(result).toContain('index="2"');
    expect(result).not.toContain('index="0"');
  });

  it('uses file_name in source, falls back to document_id', () => {
    const withName = makeChunk({ file_name: 'report.pdf', document_id: 'doc-1' });
    const withoutName = makeChunk({ file_name: undefined, document_id: 'doc-2' });
    const result = buildUserMessage('q', [withName, withoutName]);
    expect(result).toContain('<source>report.pdf</source>');
    expect(result).toContain('<source>doc-2</source>');
  });
});
